import type {
  ConversationParticipantInfo,
  CustomWebSocket,
  IncomingMessage,
  VoIPCallEndMessage,
  VoIPCallRequestMessage,
  VoIPCallResponseMessage,
  VoIPMuteStatusMessage,
  VoIPSpeakerUpdateMessage,
} from '@ortelius/websocket-types'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
} from '../../../infrastructure/database/db/schemas/chat-schema'
import {
  activeConversations,
  addUser,
  cleanupUserPresenceSubscriptions,
  connectedUsers,
  handleSubscribePresence,
  handleUnsubscribePresence,
  sendToUser,
} from '../../../infrastructure/messaging/websocket.service'
import {
  broadcastRateLimiter,
  connectionThrottler,
  messageRateLimiter,
} from '../../../infrastructure/monitoring/rate-limiter.service'
import { voipService } from '../../calls/infrastructure/voip.services'
import { notificationApplicationService } from '../../notifications/notifications.application'
import {
  createUnknownMessagePayload,
  requiresBroadcastRateLimit,
} from '../application/realtime-message-policy'

export interface WebSocketRepository {
  getConversationParticipants(conversationId: string): Promise<ConversationParticipantInfo[]>
  sendParticipantsToConversation(conversationId: string): Promise<void>
  handleMessage(userId: string, message: IncomingMessage): Promise<void>
  handleConnection(userId: string, ws: WebSocket, clientIP?: string): Promise<void>
  handleDisconnection(userId: string, ws?: WebSocket): void
}

function getPresenceUserIds(message: IncomingMessage): string[] {
  const userIds = (message as { userIds?: unknown }).userIds
  return Array.isArray(userIds) ? userIds.filter((id): id is string => typeof id === 'string') : []
}

export class RealtimeService implements WebSocketRepository {
  private async getPresenceVisibleUserIds(
    subscriberUserId: string,
    targetUserIds: string[]
  ): Promise<string[]> {
    const uniqueTargetUserIds = Array.from(new Set(targetUserIds))
    if (uniqueTargetUserIds.length === 0) return []

    const subscriberMemberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, subscriberUserId))

    const organizationIds = Array.from(
      new Set(subscriberMemberships.map((row) => row.organizationId))
    )
    if (organizationIds.length === 0) return []

    const visibleRows = await db
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(
          inArray(member.userId, uniqueTargetUserIds),
          inArray(member.organizationId, organizationIds)
        )
      )

    const visibleUserIds = new Set(visibleRows.map((row) => row.userId))
    return uniqueTargetUserIds.filter((userId) => visibleUserIds.has(userId))
  }

  async getConversationParticipants(
    conversationId: string
  ): Promise<ConversationParticipantInfo[]> {
    // Source-of-truth strategy:
    //   - For org conversations: union the live `member` table for the
    //     conversation's organizationId with `conversationParticipant`. This
    //     guards against drift where someone joined the org through a path
    //     other than invitation-accept (signup, checkout, seed scripts) and
    //     therefore never got synced into conversationParticipant — which
    //     used to make them invisible in the participants dialog.
    //   - For non-org conversations: just `conversationParticipant`.
    //
    // Either way the join is on `user`, so users without a row in `user`
    // (deleted accounts, anonymous requesters before they migrate) are
    // excluded — same behavior as before.
    const [convRow] = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    type Row = { userId: string; name: string; image: string | null }
    let rows: Row[]

    if (convRow?.organizationId) {
      // (member ∪ conversationParticipant) → catches both org members and
      // any non-org outsider who's been added explicitly (e.g. the requester
      // on a request conversation).
      const orgId = convRow.organizationId
      rows = await db
        .selectDistinct({
          userId: user.id,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .leftJoin(member, and(eq(member.userId, user.id), eq(member.organizationId, orgId)))
        .leftJoin(
          conversationParticipant,
          and(
            eq(conversationParticipant.userId, user.id),
            eq(conversationParticipant.conversationId, conversationId),
            isNull(conversationParticipant.leftAt)
          )
        )
        .where(
          or(
            eq(member.organizationId, orgId),
            eq(conversationParticipant.conversationId, conversationId)
          )
        )
    } else {
      rows = await db
        .select({
          userId: conversationParticipant.userId,
          name: user.name,
          image: user.image,
        })
        .from(conversationParticipant)
        .innerJoin(user, eq(conversationParticipant.userId, user.id))
        .where(
          and(
            eq(conversationParticipant.conversationId, conversationId),
            isNull(conversationParticipant.leftAt)
          )
        )
    }

    return rows.map((p) => ({
      userId: p.userId,
      name: p.name,
      image: p.image || undefined,
    }))
  }

  async sendParticipantsToConversation(conversationId: string): Promise<void> {
    const participants = await this.getConversationParticipants(conversationId)

    participants.forEach((participant) => {
      sendToUser(participant.userId, {
        type: 'conversation:participants',
        conversationId,
        participants,
        timestamp: new Date().toISOString(),
      })
    })
  }

  async handleConnection(userId: string, ws: WebSocket, clientIP?: string): Promise<void> {
    try {
      if (clientIP) {
        const connectionId = `${userId}_${Date.now()}`

        if (!connectionThrottler.addConnection(clientIP, connectionId)) {
          console.warn(`Connection throttled for IP ${clientIP} (user: ${userId})`)
          ws.close(1013, 'Too many connections from this IP')
          return
        }

        const customWs = ws as CustomWebSocket
        customWs.clientIP = clientIP
        customWs.throttleConnectionId = connectionId
      }

      await addUser(userId, ws as CustomWebSocket)

      // Auto-subscribe the user to notifications. Replaces the previous
      // explicit `notifications:subscribe` message — the server already
      // knows who the user is from auth, so the client doesn't need a
      // separate round-trip to opt in.
      notificationApplicationService.subscriptions.subscribe(userId)

      const sendConnectionMessage = () => {
        const success = sendToUser(userId, {
          type: 'connection:established',
          userId,
          timestamp: new Date().toISOString(),
        })

        if (!success) {
          console.error(`Failed to send connection_established message to user ${userId}`)
        }
      }

      if (ws.readyState === 1) {
        sendConnectionMessage()
      } else {
        const originalOnOpen = ws.onopen
        ws.onopen = (event) => {
          if (originalOnOpen) originalOnOpen.call(ws, event)
          sendConnectionMessage()
        }
      }
    } catch (error) {
      console.error(`Error in handleConnection for user ${userId}:`, error)
      ws.close(1011, 'Internal server error')
    }
  }

  async handleMessage(userId: string, message: IncomingMessage): Promise<void> {
    try {
      const rateLimitResult = await messageRateLimiter.checkLimit(userId)

      if (!rateLimitResult.allowed) {
        console.warn(`Message rate limit exceeded for user ${userId}`)
        sendToUser(userId, {
          type: 'error',
          code: 'rate_limit_exceeded',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          timestamp: new Date().toISOString(),
        })
        return
      }

      if (requiresBroadcastRateLimit(message.type)) {
        const broadcastRateLimit = await broadcastRateLimiter.checkLimit(userId)

        if (!broadcastRateLimit.allowed) {
          console.warn(`Broadcast rate limit exceeded for user ${userId}`)
          sendToUser(userId, {
            type: 'error',
            code: 'broadcast_rate_limit_exceeded',
            message: 'Too many broadcast messages. Please slow down.',
            timestamp: new Date().toISOString(),
          })
          return
        }
      }

      switch (message.type) {
        case 'chat:typing':
          if (message.conversationId) {
            const participants = await db
              .select()
              .from(conversationParticipant)
              .where(
                and(
                  eq(conversationParticipant.conversationId, message.conversationId),
                  isNull(conversationParticipant.leftAt)
                )
              )

            // Confirm sender is in the conversation before broadcasting their
            // typing state. Without this, any authenticated user who knows a
            // conversationId could spam typing indicators into private chats
            // they're not part of.
            const senderIsMember = participants.some((p) => p.userId === userId)
            if (!senderIsMember) {
              break
            }

            const [typingUser] = await db
              .select({
                name: user.name,
                image: user.image,
              })
              .from(user)
              .where(eq(user.id, userId))

            participants
              .filter((participant) => participant.userId !== userId)
              .forEach((participant) => {
                sendToUser(participant.userId, {
                  type: 'chat:typing',
                  conversationId: message.conversationId,
                  isTyping: message.isTyping,
                  userId: userId,
                  userName: typingUser?.name,
                  userImage: typingUser?.image,
                  timestamp: new Date().toISOString(),
                })
              })
          }
          break

        // message:new removed — clients used to fan out their own message
        // payload over WS after the POST, but message.services already
        // broadcasts the canonical (server-enriched) row to participants
        // when the message is created. Trusting the client side enabled
        // spoofing: anyone who knew a conversationId could push arbitrary
        // {senderId, content, ...} that the recipients rendered as a real
        // message.

        // notifications:subscribe / notifications:subscribed removed — the
        // server now auto-subscribes the user at WS connect time
        // (see handleConnection in this file).

        case 'conversation:set_active':
          activeConversations.set(userId, message.conversationId ?? null)
          console.log(
            `User ${userId} is now ${message.conversationId ? `viewing conversation ${message.conversationId}` : 'not viewing any conversation'}`
          )
          sendToUser(userId, {
            type: 'conversation:set_active',
            conversationId: message.conversationId ?? null,
            timestamp: new Date().toISOString(),
          })
          break

        // status:update removed — use PATCH /api/users/me/status instead.
        // The server still pushes status:updated over WS to subscribers.

        // conversation:get_participants removed — use
        // GET /api/conversations/:id/participants instead.

        case 'presence:subscribe':
          await handleSubscribePresence(
            userId,
            await this.getPresenceVisibleUserIds(userId, getPresenceUserIds(message))
          )
          break

        case 'presence:unsubscribe':
          handleUnsubscribePresence(userId, getPresenceUserIds(message))
          break

        case 'call:request':
          await voipService.handleCallRequest(userId, message as VoIPCallRequestMessage)
          break

        case 'call:response':
          await voipService.handleCallResponse(userId, message as VoIPCallResponseMessage)
          break

        case 'call:end':
          await voipService.handleCallEnd(userId, message as VoIPCallEndMessage)
          break

        case 'call:speaker_update':
          await voipService.handleSpeakerUpdate(userId, message as VoIPSpeakerUpdateMessage)
          break

        // Legacy voip:offer/answer/ice_candidate handlers removed — the
        // dedicated /api/call WebSocket has been the canonical signaling
        // channel for some time.

        case 'call:mute_status':
          await voipService.handleMuteStatus(userId, message as VoIPMuteStatusMessage)
          break

        // call:join / call:leave / call:heartbeat / call:metrics_batch removed
        // from this channel — the dedicated /api/call WebSocket owns the
        // active-call lifecycle (call-ws.manager.ts), and metrics use
        // POST /api/calls/:callId/metrics now.

        default:
          sendToUser(userId, createUnknownMessagePayload(message.type))
      }
    } catch (error) {
      console.error(`Error in handleMessage for user ${userId}:`, error)
      sendToUser(userId, {
        type: 'error',
        code: 'internal_error',
        message: 'Failed to process message',
        timestamp: new Date().toISOString(),
      })
    }
  }

  handleDisconnection(userId: string, ws?: WebSocket): void {
    try {
      if (ws) {
        const customWs = ws as CustomWebSocket & {
          clientIP?: string
          throttleConnectionId?: string
        }
        if (customWs.clientIP && customWs.throttleConnectionId) {
          connectionThrottler.removeConnection(customWs.clientIP, customWs.throttleConnectionId)
        }
      }

      // Per-connection cleanup (removeUser with connectionId) was already done
      // by handleClose in websocket.service.ts. Only run the user-level cleanup
      // if no other tabs/devices of this user remain.
      if (!connectedUsers.has(userId)) {
        notificationApplicationService.subscriptions.unsubscribe(userId)
        activeConversations.delete(userId)
        // Drop the presence:subscribe subscriptions this user accumulated.
        // Without this the (subscriber → targets) and (target → subscribers)
        // maps in websocket.service.ts grow zombies on every reconnect.
        cleanupUserPresenceSubscriptions(userId)
      }
    } catch (error) {
      console.error(`Error in handleDisconnection for user ${userId}:`, error)
    }
  }
}

export const realtimeService = new RealtimeService()
