import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RedisService } from '../../../../infrastructure/cache/redis.service'

/**
 * Multi-instance integration test. Simulates 2+ Hono pods sharing one Redis,
 * with a real cross-pod hand-off:
 *
 *   pod A:   user1 connected
 *   pod B:   user2 connected
 *   user2 sends a signaling message → arrives at user1 via Redis pub/sub
 *
 * Made possible by the DI refactor: each `CallWebSocketManager` accepts its
 * own `RedisService`. The test wires two independent services to a shared
 * in-memory bus; published messages flow to the OTHER instance's subscriber.
 */

// ---------- DB mocks (shared across pods, like a real DB) ----------

let currentCallRow: {
  id: string
  callerId: string
  calleeId: string | null
  status?: 'pending' | 'active' | 'ended' | 'rejected' | 'missed'
} | null = null
let currentCallParticipants: Array<{ userId: string }> = []
const VOIP_CALL_SENTINEL = { __sentinel: 'voipCall' }
const VOIP_CALL_PARTICIPANT_SENTINEL = { __sentinel: 'voipCallParticipant' }

mock.module('../../../../infrastructure/database', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            if (table === VOIP_CALL_SENTINEL) {
              const row =
                currentCallRow && currentCallRow.status === undefined
                  ? { ...currentCallRow, status: 'active' as const }
                  : currentCallRow
              return Promise.resolve(row ? [row] : [])
            }
            if (table === VOIP_CALL_PARTICIPANT_SENTINEL) {
              return Promise.resolve(currentCallParticipants)
            }
            return Promise.resolve([])
          },
        }),
      }),
    }),
    insert: () => ({ values: () => Promise.resolve() }),
  },
}))

mock.module('../../../../infrastructure/database/db/schemas/chat-schema', () => ({
  voipCall: VOIP_CALL_SENTINEL,
  voipCallParticipant: VOIP_CALL_PARTICIPANT_SENTINEL,
}))

mock.module('../../../../infrastructure/database/db/schemas/call-schema', () => ({
  callMetrics: {},
}))

// We don't import the default redisService — we construct fakes per-pod.
// Mock the module to a no-op redisService so the SUT module loads cleanly,
// but every manager we test is constructed with an explicit fake.
mock.module('../../../../infrastructure/cache/redis.service', () => ({
  RedisService: class {},
  redisService: {
    getClient: () => ({
      sadd: () => Promise.resolve(1),
      srem: () => Promise.resolve(1),
      sismember: () => Promise.resolve(0),
      rpush: () => Promise.resolve(1),
      expire: () => Promise.resolve(1),
      lrange: () => Promise.resolve([]),
      del: () => Promise.resolve(1),
    }),
    subscribe: () => Promise.resolve(),
    publish: () => Promise.resolve(),
    getInstanceId: () => 'unused',
  },
  RedisChannels: {
    WS_MESSAGES: 'ws:messages',
    USER_PRESENCE: 'user:presence',
    CALL_WS_MESSAGES: 'call:ws:messages',
  },
}))

import { CallWebSocketManager } from '../../call-ws.manager'

// ---------- Shared in-memory Redis bus ----------

type DistributedCallMessage = {
  kind: 'send-to-user' | 'broadcast-to-call'
  targetUserId?: string
  callId?: string
  excludeUserId?: string
  payload: Record<string, unknown>
  sourceInstanceId?: string
}

type Subscriber = (raw: unknown) => void

class FakeRedisBus {
  private subscribers = new Map<string, Set<Subscriber>>()
  publish(channel: string, payload: DistributedCallMessage): void {
    const subs = this.subscribers.get(channel) ?? new Set()
    for (const s of subs) s(payload)
  }
  subscribe(channel: string, sub: Subscriber): void {
    const subs = this.subscribers.get(channel) ?? new Set<Subscriber>()
    subs.add(sub)
    this.subscribers.set(channel, subs)
  }
}

// Online-presence Redis Set, shared. Each call to sismember answers based
// on whether ANY pod has marked the user online.
class FakePresence {
  private online = new Set<string>()
  sadd(_key: string, userId: string) {
    this.online.add(userId)
    return Promise.resolve(1)
  }
  srem(_key: string, userId: string) {
    this.online.delete(userId)
    return Promise.resolve(1)
  }
  sismember(_key: string, userId: string) {
    return Promise.resolve(this.online.has(userId) ? 1 : 0)
  }
  // Pending message buffer (per-user list).
  private pending = new Map<string, string[]>()
  rpush(key: string, value: string) {
    const arr = this.pending.get(key) ?? []
    arr.push(value)
    this.pending.set(key, arr)
    return Promise.resolve(1)
  }
  expire(_key: string, _seconds: number) {
    return Promise.resolve(1)
  }
  lrange(key: string, _start: number, _end: number) {
    return Promise.resolve(this.pending.get(key) ?? [])
  }
  del(key: string) {
    this.pending.delete(key)
    return Promise.resolve(1)
  }
}

function makePodRedis(instanceId: string, bus: FakeRedisBus, presence: FakePresence): RedisService {
  return {
    getClient: (_name?: 'cache' | 'default' | 'subscriber') =>
      presence as unknown as ReturnType<RedisService['getClient']>,
    subscribe: (channel: string, handler: Subscriber) => {
      bus.subscribe(channel, handler)
      return Promise.resolve()
    },
    publish: (channel: string, payload: Record<string, unknown>, _includeSource = false) => {
      // Real RedisService stamps sourceInstanceId on publish when
      // includeSource = true. Mirror that behavior for the skip-self test.
      bus.publish(channel, { ...(payload as DistributedCallMessage), sourceInstanceId: instanceId })
      return Promise.resolve()
    },
    getInstanceId: () => instanceId,
  } as unknown as RedisService
}

// ---------- Fixtures ----------

class StubWs {
  readyState = 1
  received: Record<string, unknown>[] = []
  send(data: string) {
    try {
      this.received.push(JSON.parse(data))
    } catch {
      /* ignore */
    }
  }
}

const lastOf = (ws: StubWs, type: string) => [...ws.received].reverse().find((m) => m.type === type)

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

// ---------- Tests ----------

describe('multi-instance Redis pub/sub (real DI)', () => {
  let bus: FakeRedisBus
  let presence: FakePresence

  beforeEach(() => {
    bus = new FakeRedisBus()
    presence = new FakePresence()
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
  })

  it('cross-pod: pod B sends offer → pod A delivers it to the caller locally', async () => {
    const podA = new CallWebSocketManager(makePodRedis('pod-A', bus, presence))
    const podB = new CallWebSocketManager(makePodRedis('pod-B', bus, presence))
    podA.start()
    podB.start()
    await flush()

    const callerWs = new StubWs()
    const calleeWs = new StubWs()
    podA.handleConnection(callerWs, 'caller')
    podB.handleConnection(calleeWs, 'callee')

    // Both peers join the call (each on their own pod).
    await podA.handleMessage(
      callerWs,
      JSON.stringify({ type: 'call:join', callId: 'call-1' }),
      'caller'
    )
    await podB.handleMessage(
      calleeWs,
      JSON.stringify({ type: 'call:join', callId: 'call-1' }),
      'callee'
    )
    await flush()

    callerWs.received = []
    calleeWs.received = []

    // Callee on pod B sends an offer.
    // Pod B's handleSignaling: recipient is caller. caller is NOT connected
    // to pod B locally → sendLocal returns false → publish to Redis →
    // pod A's subscriber receives → delivers to callerWs locally.
    await podB.handleMessage(
      calleeWs,
      JSON.stringify({ type: 'webrtc:offer', callId: 'call-1', sdp: 'v=0...' }),
      'callee'
    )
    await flush()

    const offerOnCaller = lastOf(callerWs, 'webrtc:offer')
    expect(offerOnCaller).toBeDefined()
    expect(offerOnCaller?.from).toBe('callee')
    expect(offerOnCaller?.sdp).toBe('v=0...')

    // Callee's own ws does NOT receive its own message back via Redis loop.
    expect(lastOf(calleeWs, 'webrtc:offer')).toBeUndefined()
  })

  it('source-instance skip: pod A does not double-deliver its own publish locally', async () => {
    const podA = new CallWebSocketManager(makePodRedis('pod-solo', bus, presence))
    podA.start()
    await flush()

    const ws1 = new StubWs()
    const ws2 = new StubWs()
    podA.handleConnection(ws1, 'user-x')
    podA.handleConnection(ws2, 'user-x')

    podA.sendToUser('user-x', { type: 'custom:thing' })
    await flush()

    // Each connection got it exactly once (local delivery only). The
    // subscriber's "skip own instance" prevented a second delivery via Redis.
    expect(ws1.received.filter((m) => m.type === 'custom:thing')).toHaveLength(1)
    expect(ws2.received.filter((m) => m.type === 'custom:thing')).toHaveLength(1)
  })

  it('cross-pod broadcastToCall: caller on pod A receives mute event from pod B', async () => {
    const podA = new CallWebSocketManager(makePodRedis('pod-A2', bus, presence))
    const podB = new CallWebSocketManager(makePodRedis('pod-B2', bus, presence))
    podA.start()
    podB.start()
    await flush()

    // 1-to-1 call (callerId + calleeId both set) so isParticipantOf passes
    // for both peers without relying on voipCallParticipant table rows.
    currentCallRow = { id: 'call-2', callerId: 'caller', calleeId: 'callee' }
    const wsA = new StubWs()
    const wsB = new StubWs()
    podA.handleConnection(wsA, 'caller')
    podB.handleConnection(wsB, 'callee')

    await podA.handleMessage(wsA, JSON.stringify({ type: 'call:join', callId: 'call-2' }), 'caller')
    await podB.handleMessage(wsB, JSON.stringify({ type: 'call:join', callId: 'call-2' }), 'callee')
    await flush()

    wsA.received = []
    wsB.received = []

    // Mute from podB. broadcastToCall on pod B publishes to Redis →
    // pod A's subscriber → broadcastLocal to pod A's tracked participants
    // for call-2 (just `caller`) → wsA receives.
    await podB.handleMessage(
      wsB,
      JSON.stringify({ type: 'participant:mute', callId: 'call-2', isMuted: true }),
      'callee'
    )
    await flush()

    expect(lastOf(wsA, 'participant:mute')?.userId).toBe('callee')
    // Source pod's own ws is excluded.
    expect(lastOf(wsB, 'participant:mute')).toBeUndefined()
  })

  it('user reconnects on different pod: pending messages drained from Redis buffer', async () => {
    const podA = new CallWebSocketManager(makePodRedis('pod-A', bus, presence))
    const podB = new CallWebSocketManager(makePodRedis('pod-B', bus, presence))
    podA.start()
    podB.start()
    await flush()

    // 'late-user' is offline globally — no presence registered yet.
    // Pod A sends a message to them → not online → buffer in Redis.
    podA.sendToUser('late-user', { type: 'late:msg', payload: 'hello' })
    await flush()
    // Allow the buffer-if-offline flow to complete (it's async).
    await new Promise((r) => setTimeout(r, 10))

    // Now the user reconnects on pod B. handleConnection drains pending msgs.
    const lateWs = new StubWs()
    podB.handleConnection(lateWs, 'late-user')
    await flush()
    await new Promise((r) => setTimeout(r, 10))

    expect(lastOf(lateWs, 'late:msg')?.payload).toBe('hello')
  })
})
