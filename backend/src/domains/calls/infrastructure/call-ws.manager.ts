import { and, eq } from 'drizzle-orm'
import {
  redisService as defaultRedisService,
  RedisChannels,
  type RedisService,
} from '../../../infrastructure/cache/redis.service'
import { db } from '../../../infrastructure/database'
import {
  voipCall,
  voipCallParticipant,
} from '../../../infrastructure/database/db/schemas/chat-schema'

export interface WebSocketMessage {
  type: string
  callId: string
  [key: string]: unknown
}

export interface WebRTCSignalingMessage extends WebSocketMessage {
  type: 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice'
  sdp?: string
  candidate?: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
}

type Sendable = { send: (data: string) => void; readyState?: number }

const ONLINE_SET_KEY = 'call-ws:online'

// voip_call.status enum is { pending | active | ended | rejected | missed }.
// Only the first two should accept join + signaling — the others are terminal.
const CALL_SIGNALING_STATUSES = new Set<string>(['pending', 'active'])

interface DistributedCallMessage {
  kind: 'send-to-user' | 'broadcast-to-call'
  targetUserId?: string
  callId?: string
  excludeUserId?: string
  payload: Record<string, unknown>
  sourceInstanceId?: string
}

export class CallWebSocketManager {
  private connections = new Map<string, Set<Sendable>>()
  private callParticipants = new Map<string, Set<string>>()
  private lastSeen = new Map<Sendable, number>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private readonly STALE_TIMEOUT = 5 * 60 * 1000
  private readonly CLEANUP_INTERVAL = 60 * 1000
  private redisSubscribed = false
  private readonly redis: RedisService

  constructor(redis: RedisService = defaultRedisService) {
    this.redis = redis
  }

  start(): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => this.cleanupStaleConnections(), this.CLEANUP_INTERVAL)
    this.ensureRedisSubscription()
    void this.assertRedisReachable()
  }

  /**
   * Pings Redis at startup so a misconfigured pod (wrong host, missing
   * password, etc.) crashes loudly instead of silently failing every
   * cross-pod sendToUser. Logs but does not throw — we still want the pod
   * to boot, just with a clear signal in the logs.
   */
  private async assertRedisReachable(): Promise<void> {
    try {
      const client = this.redis.getClient('cache')
      const reply = await client.ping()
      if (reply === 'PONG') {
        console.info(`[CallWS] Redis reachable (instance ${this.redis.getInstanceId()})`)
      } else {
        console.error(`[CallWS] Redis ping returned unexpected: ${reply}`)
      }
    } catch (err) {
      console.error('[CallWS] Redis ping FAILED — cross-pod messaging will not work:', err)
    }
  }

  private ensureRedisSubscription(): void {
    if (this.redisSubscribed) return
    this.redisSubscribed = true
    this.redis
      .subscribe(RedisChannels.CALL_WS_MESSAGES, (raw) => {
        const msg = raw as DistributedCallMessage
        // Skip messages we ourselves emitted (already sent locally before publishing).
        if (msg.sourceInstanceId === this.redis.getInstanceId()) return
        if (msg.kind === 'send-to-user' && msg.targetUserId) {
          this.sendLocal(msg.targetUserId, msg.payload)
        } else if (msg.kind === 'broadcast-to-call' && msg.callId) {
          this.broadcastLocal(msg.callId, msg.payload, msg.excludeUserId)
        }
      })
      .catch((err) => {
        console.error('[CallWS] Failed to subscribe to Redis:', err)
        this.redisSubscribed = false
      })
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.connections.clear()
    this.callParticipants.clear()
    this.lastSeen.clear()
  }

  private cleanupStaleConnections(): void {
    const now = Date.now()
    let cleaned = 0
    for (const [userId, userConnections] of this.connections) {
      const stale: Sendable[] = []
      for (const ws of userConnections) {
        const last = this.lastSeen.get(ws)
        if (last && now - last > this.STALE_TIMEOUT) stale.push(ws)
      }
      for (const ws of stale) {
        userConnections.delete(ws)
        this.lastSeen.delete(ws)
        cleaned++
      }
      if (userConnections.size === 0) this.connections.delete(userId)
    }
    if (cleaned > 0) console.info(`[CallWS] Cleaned up ${cleaned} stale connections`)
  }

  handleConnection(ws: Sendable, userId: string): void {
    if (!this.connections.has(userId)) this.connections.set(userId, new Set())
    this.connections.get(userId)!.add(ws)
    this.lastSeen.set(ws, Date.now())

    console.info(`[CallWS] User ${userId} connected`)

    try {
      ws.send(
        JSON.stringify({
          type: 'connection:established',
          userId,
          timestamp: new Date().toISOString(),
        })
      )
    } catch {
      // Connection may close immediately; ignore.
    }

    this.redis
      .getClient('cache')
      .sadd(ONLINE_SET_KEY, userId)
      .catch((err) => console.error('[CallWS] Failed to mark user online:', err))

    this.drainPendingMessages(userId).catch((err) =>
      console.error(`[CallWS] Failed to drain pending messages for ${userId}:`, err)
    )
  }

  private pendingKey(userId: string): string {
    return `signal:pending:${userId}`
  }

  private async bufferPendingMessage(
    userId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const client = this.redis.getClient('cache')
      const key = this.pendingKey(userId)
      await client.rpush(key, JSON.stringify(payload))
      await client.expire(key, 30)
    } catch (err) {
      console.error(`[CallWS] Failed to buffer pending message for ${userId}:`, err)
    }
  }

  private async drainPendingMessages(userId: string): Promise<void> {
    const client = this.redis.getClient('cache')
    const key = this.pendingKey(userId)
    const items = await client.lrange(key, 0, -1)
    if (items.length === 0) return
    await client.del(key)
    for (const raw of items) {
      try {
        const data = JSON.parse(raw) as Record<string, unknown>
        this.sendLocal(userId, data)
      } catch (err) {
        console.error('[CallWS] Failed to replay pending message:', err)
      }
    }
    console.info(`[CallWS] Drained ${items.length} pending messages for ${userId}`)
  }

  handleDisconnection(ws: Sendable, userId: string): void {
    const userConnections = this.connections.get(userId)
    if (userConnections) {
      userConnections.delete(ws)
      this.lastSeen.delete(ws)
      if (userConnections.size === 0) {
        this.connections.delete(userId)
        this.redis
          .getClient('cache')
          .srem(ONLINE_SET_KEY, userId)
          .catch((err) => console.error('[CallWS] Failed to mark user offline:', err))
      }
    }
    console.info(`[CallWS] User ${userId} disconnected`)
  }

  private async isUserOnlineGlobally(userId: string): Promise<boolean> {
    if (this.connections.has(userId)) return true
    try {
      const present = await this.redis.getClient('cache').sismember(ONLINE_SET_KEY, userId)
      return present === 1
    } catch (err) {
      console.error('[CallWS] presence check failed:', err)
      return false
    }
  }

  async handleMessage(ws: Sendable, raw: string | Buffer, userId: string): Promise<void> {
    this.lastSeen.set(ws, Date.now())
    try {
      if (Buffer.isBuffer(raw)) {
        // Binary payload — reserved for future audio relay; nothing to do for now.
        return
      }
      const data = JSON.parse(raw) as WebSocketMessage
      switch (data.type) {
        case 'webrtc:offer':
        case 'webrtc:answer':
        case 'webrtc:ice':
          await this.handleSignaling(data as WebRTCSignalingMessage, userId)
          break
        // metrics:batch removed — clients now use POST /api/calls/:id/metrics
        // (HTTP is queueable + retryable, doesn't block on a live WS).
        case 'call:join':
          await this.handleCallJoin(data.callId, userId)
          break
        case 'call:leave':
          this.handleCallLeave(data.callId, userId)
          break
        case 'participant:mute':
          this.handleParticipantMute(data.callId, userId, Boolean(data.isMuted))
          break
        default:
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${data.type}`,
            })
          )
      }
    } catch (error) {
      console.error('[CallWS] Error handling message:', error)
      try {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        )
      } catch {
        // Connection may be closed.
      }
    }
  }

  private async loadCall(callId: string) {
    const [row] = await db.select().from(voipCall).where(eq(voipCall.id, callId)).limit(1)
    return row ?? null
  }

  private async isParticipantOf(callId: string, userId: string): Promise<boolean> {
    const call = await this.loadCall(callId)
    if (!call) return false
    if (call.callerId === userId) return true
    if (call.calleeId && call.calleeId === userId) return true
    // Group call (calleeId null) → look up this user directly in
    // voipCallParticipant. Filtering on (callId, userId) is the only correct
    // membership test — fetching by callId alone and inspecting the first row
    // would reject every participant except whichever one happened to come
    // back first.
    const [match] = await db
      .select({ userId: voipCallParticipant.userId })
      .from(voipCallParticipant)
      .where(and(eq(voipCallParticipant.callId, callId), eq(voipCallParticipant.userId, userId)))
      .limit(1)
    return Boolean(match)
  }

  private async handleSignaling(message: WebRTCSignalingMessage, senderId: string): Promise<void> {
    const call = await this.loadCall(message.callId)
    if (!call) throw new Error('Call not found')
    // Reject signaling for terminal calls. Without this, a peer who hasn't
    // realized the call ended (network blip, race with the call:end push)
    // can keep flooding offers/ICE that bounce around for nothing, and a
    // reconnecting client could land on an "ended" row and look connected.
    if (!CALL_SIGNALING_STATUSES.has(call.status)) {
      throw new Error(`Call is ${call.status}, signaling not allowed`)
    }

    const isCaller = call.callerId === senderId
    const isCallee = call.calleeId === senderId
    if (!isCaller && !isCallee) {
      // Group call: sender is not the canonical caller/callee, so we have to
      // verify they're actually in voipCallParticipant before broadcasting.
      // Without this an authenticated user who knows the callId could inject
      // signaling into a call they're not in.
      if (!call.calleeId) {
        const [match] = await db
          .select({ userId: voipCallParticipant.userId })
          .from(voipCallParticipant)
          .where(
            and(
              eq(voipCallParticipant.callId, message.callId),
              eq(voipCallParticipant.userId, senderId)
            )
          )
          .limit(1)
        if (!match) {
          throw new Error('You are not a participant of this call')
        }
        this.broadcastToCall(message.callId, { ...message, from: senderId }, senderId)
        return
      }
      throw new Error('You are not a participant of this call')
    }

    const recipientId = isCaller ? call.calleeId : call.callerId
    if (recipientId) {
      this.sendToUser(recipientId, { ...message, from: senderId })
    }
  }

  // handleMetricsBatch removed — clients use POST /api/calls/:id/metrics now.

  private async handleCallJoin(callId: string, userId: string): Promise<void> {
    if (!(await this.isParticipantOf(callId, userId))) {
      throw new Error('You are not a participant of this call')
    }
    const call = await this.loadCall(callId)
    if (!call) throw new Error('Call not found')
    // Joining a terminal call would set up signaling state for a row that
    // can't progress — see handleSignaling for the same check.
    if (!CALL_SIGNALING_STATUSES.has(call.status)) {
      throw new Error(`Call is ${call.status}, cannot join`)
    }
    if (!this.callParticipants.has(callId)) this.callParticipants.set(callId, new Set())
    this.callParticipants.get(callId)!.add(userId)
    const timestamp = new Date().toISOString()

    this.sendLocal(userId, {
      type: 'call:ready',
      callId,
      timestamp,
    })

    const joinedPayload = {
      type: 'participant:joined' as const,
      callId,
      userId,
      timestamp,
    }

    const explicitlyNotified = new Set<string>()
    if (call) {
      if (call.callerId && call.callerId !== userId) explicitlyNotified.add(call.callerId)
      if (call.calleeId && call.calleeId !== userId) explicitlyNotified.add(call.calleeId)
      for (const peerId of explicitlyNotified) {
        this.sendToUser(peerId, joinedPayload)
      }
    }

    // Group call extras (participants beyond the canonical caller/callee).
    this.broadcastToCall(callId, joinedPayload, userId)
  }

  private handleCallLeave(callId: string, userId: string): void {
    const participants = this.callParticipants.get(callId)
    if (participants) {
      participants.delete(userId)
      if (participants.size === 0) this.callParticipants.delete(callId)
    }
    this.broadcastToCall(callId, {
      type: 'participant:left',
      callId,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  private handleParticipantMute(callId: string, userId: string, isMuted: boolean): void {
    this.broadcastToCall(
      callId,
      {
        type: 'participant:mute',
        callId,
        userId,
        isMuted,
        timestamp: new Date().toISOString(),
      },
      userId
    )
  }

  private sendLocal(userId: string, data: Record<string, unknown>): boolean {
    const userConnections = this.connections.get(userId)
    if (!userConnections || userConnections.size === 0) return false
    const payload = JSON.stringify(data)
    for (const ws of userConnections) {
      try {
        ws.send(payload)
      } catch (error) {
        console.error(`[CallWS] Error sending to user ${userId}:`, error)
      }
    }
    return true
  }

  private broadcastLocal(
    callId: string,
    data: Record<string, unknown>,
    excludeUserId?: string
  ): void {
    const participants = this.callParticipants.get(callId)
    if (!participants) return
    const payload = JSON.stringify(data)
    for (const userId of participants) {
      if (excludeUserId && userId === excludeUserId) continue
      const userConnections = this.connections.get(userId)
      if (!userConnections) continue
      for (const ws of userConnections) {
        try {
          ws.send(payload)
        } catch (error) {
          console.error(`[CallWS] Error broadcasting to user ${userId}:`, error)
        }
      }
    }
  }

  sendToUser(userId: string, data: Record<string, unknown>): void {
    const deliveredLocally = this.sendLocal(userId, data)
    this.redis
      .publish(
        RedisChannels.CALL_WS_MESSAGES,
        { kind: 'send-to-user', targetUserId: userId, payload: data },
        true
      )
      .catch((err) => console.error('[CallWS] Redis publish (send) failed:', err))

    if (!deliveredLocally) {
      this.isUserOnlineGlobally(userId)
        .then((online) => {
          if (!online) return this.bufferPendingMessage(userId, data)
        })
        .catch((err) => console.error('[CallWS] buffer-if-offline failed:', err))
    }
  }

  broadcastToCall(callId: string, data: Record<string, unknown>, excludeUserId?: string): void {
    this.broadcastLocal(callId, data, excludeUserId)
    this.redis
      .publish(
        RedisChannels.CALL_WS_MESSAGES,
        { kind: 'broadcast-to-call', callId, excludeUserId, payload: data },
        true
      )
      .catch((err) => console.error('[CallWS] Redis publish (broadcast) failed:', err))
  }

  getActiveConnections(): number {
    return this.connections.size
  }

  getCallParticipants(callId: string): string[] {
    return Array.from(this.callParticipants.get(callId) ?? [])
  }
}

export const callWebSocketManager = new CallWebSocketManager()
// NOTE: do NOT auto-start at module load — call `start()` explicitly from
// `src/index.ts` so that:
//  - Tests can import this module without triggering Redis subscriptions
//    before their mocks are in place (avoids cross-file mock pollution).
//  - Startup ordering is visible in one place alongside other schedulers.
