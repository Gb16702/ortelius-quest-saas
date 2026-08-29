import type {
  VoIPAnswerMessage,
  VoIPCallEndMessage,
  VoIPCallRequestMessage,
  VoIPCallResponseMessage,
  VoIPIceCandidateMessage,
  VoIPMuteStatusMessage,
  VoIPOfferMessage,
  VoIPSpeakerUpdateMessage,
} from '@ortelius/websocket-types'
import { and, eq, isNull } from 'drizzle-orm'
import { redisService } from '../../../infrastructure/cache/redis.service'
import { db } from '../../../infrastructure/database'
import { user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { conversationParticipant } from '../../../infrastructure/database/db/schemas/chat-schema'
import { isUserOnline, sendToUser } from '../../../infrastructure/messaging/websocket.service'
import { messageApplicationService as messageService } from '../../messaging/message/message.application'

type ConversationParticipant = {
  userId: string
  userName: string | null
  userImage: string | null
}

import { callSessionService } from './call-session.store'

const CACHE_TTL = 60
const USER_INFO_CACHE_TTL = 300 // 5 minutes for user info

export class VoIPService {
  private async getUserInfo(userId: string) {
    const cacheKey = `user_info:${userId}`
    const redis = redisService.getClient()

    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      const [userInfo] = await db
        .select({
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, userId))

      if (userInfo) {
        await redis.setex(cacheKey, USER_INFO_CACHE_TTL, JSON.stringify(userInfo))
      }

      return userInfo
    } catch (error) {
      console.error(`Error getting user info for ${userId}:`, error)
      const [userInfo] = await db
        .select({
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, userId))
      return userInfo
    }
  }

  private async getConversationParticipants(conversationId: string) {
    const cacheKey = `conv_participants:${conversationId}`
    const redis = redisService.getClient()

    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      const participants = await db
        .select({
          userId: conversationParticipant.userId,
          userName: user.name,
          userImage: user.image,
        })
        .from(conversationParticipant)
        .innerJoin(user, eq(conversationParticipant.userId, user.id))
        .where(
          and(
            eq(conversationParticipant.conversationId, conversationId),
            isNull(conversationParticipant.leftAt)
          )
        )

      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(participants))
      return participants
    } catch (error) {
      console.error('Error getting conversation participants:', error)
      return await db
        .select({
          userId: conversationParticipant.userId,
          userName: user.name,
          userImage: user.image,
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
  }

  private getOnlineParticipants(participants: { userId: string }[], excludeUserId?: string) {
    return participants.filter(
      (p: { userId: string }) => p.userId !== excludeUserId && isUserOnline(p.userId)
    )
  }

  async handleCallRequest(userId: string, data: VoIPCallRequestMessage): Promise<void> {
    if (!data.conversationId) {
      sendToUser(userId, {
        type: 'error',
        message: 'Conversation ID is required',
        timestamp: new Date().toISOString(),
      })
      return
    }

    if (!data.callType || (data.callType !== 'audio' && data.callType !== 'video')) {
      sendToUser(userId, {
        type: 'error',
        message: 'Call type must be audio or video',
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Generate callId if not provided
    const callId = data.callId || `call_${userId}_${Date.now()}`
    const timestamp = new Date().toISOString()

    try {
      // Get conversation participants
      const participants = await this.getConversationParticipants(data.conversationId)

      const onlineParticipantIds = this.getOnlineParticipants(participants, userId)

      if (onlineParticipantIds.length === 0) {
        sendToUser(userId, {
          type: 'call:no_participants',
          message: 'No other participants are online',
          timestamp,
        })
        return
      }

      const callData = {
        type: 'call:request',
        callId,
        conversationId: data.conversationId,
        callType: data.callType,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        fromUserImage: data.fromUserImage,
        timestamp,
      }

      callSessionService.startCall(callId, data.conversationId, [
        {
          userId,
          userName: data.fromUserName || 'Unknown',
          joinedAt: new Date(),
        },
      ])

      onlineParticipantIds.forEach((participant: { userId: string }) => {
        sendToUser(participant.userId, callData)
      })

      sendToUser(userId, {
        type: 'call:initiated',
        callId: callData.callId,
        conversationId: callData.conversationId,
        callType: callData.callType,
        fromUserId: callData.fromUserId,
        fromUserName: callData.fromUserName,
        fromUserImage: callData.fromUserImage,
        timestamp: callData.timestamp,
        participantsCount: onlineParticipantIds.length,
      })
    } catch (error) {
      console.error('Error handling VoIP call request:', error)
      sendToUser(userId, {
        type: 'error',
        message: 'Failed to initiate call',
        timestamp,
      })
    }
  }

  async handleCallResponse(userId: string, data: VoIPCallResponseMessage): Promise<void> {
    if (!data.callId || !data.conversationId || data.accepted === undefined) {
      sendToUser(userId, {
        type: 'error',
        message: 'Missing required fields',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const timestamp = new Date().toISOString()

    try {
      const participants = await this.getConversationParticipants(data.conversationId)

      if (data.accepted) {
        const userInfo = await this.getUserInfo(userId)
        if (userInfo) {
          callSessionService.addParticipant(data.callId, {
            userId,
            userName: userInfo.name,
            joinedAt: new Date(),
          })
        }
      }

      const responseData: VoIPCallResponseMessage = {
        type: 'call:response',
        callId: data.callId,
        conversationId: data.conversationId,
        accepted: data.accepted,
        fromUserId: userId,
        timestamp,
        ...(data.participantJoined && {
          participantJoined: data.participantJoined,
        }),
        ...(data.participantLeft && { participantLeft: data.participantLeft }),
        ...(data.webrtcConfig && { webrtcConfig: data.webrtcConfig }),
      }

      participants.forEach((participant: ConversationParticipant) => {
        if (participant.userId !== userId) {
          sendToUser(participant.userId, responseData)
        }
      })
    } catch (error) {
      console.error('Error handling VoIP call response:', error)
    }
  }

  async handleCallEnd(userId: string, data: VoIPCallEndMessage): Promise<void> {
    if (!data.callId || !data.conversationId) {
      return
    }

    const timestamp = new Date().toISOString()

    try {
      const participants = await this.getConversationParticipants(data.conversationId)

      const callInfo = callSessionService.endCall(data.callId)

      const endData = {
        callId: data.callId,
        conversationId: data.conversationId,
        endedBy: userId,
        timestamp,
      }

      participants.forEach((participant: ConversationParticipant) => {
        sendToUser(participant.userId, {
          // Match the canonical end-of-call type the frontend listens for.
          // The HTTPS path (call-events.handler.ts) already uses 'call:end';
          // this WS path was emitting 'call:ended' which nothing was catching.
          type: 'call:end',
          ...endData,
        })
      })

      if (callInfo) {
        const duration = callInfo.duration
        const minutes = Math.floor(duration / 60)

        // Get the user who ended the call
        const userInfo = await this.getUserInfo(userId)
        const userName = userInfo?.name || 'Someone'

        // Format duration
        let durationStr: string
        if (minutes > 0) {
          durationStr = minutes === 1 ? '1 minute' : `${minutes} minutes`
        } else {
          durationStr = 'few seconds'
        }

        const systemMessageContent = `${userName} started a call that lasted ${durationStr}`

        await messageService.createSystemMessage({
          conversationId: data.conversationId,
          senderId: userId,
          content: systemMessageContent,
          metadata: {
            type: 'call_summary',
            callId: data.callId,
            duration,
            participantCount: callInfo.participants.length,
          },
        })
      }
    } catch (error) {
      console.error('Error handling VoIP call end:', error)
    }
  }

  async handleSpeakerUpdate(userId: string, data: VoIPSpeakerUpdateMessage): Promise<void> {
    if (!data.callId || !data.conversationId) {
      return
    }

    const timestamp = new Date().toISOString()

    try {
      const participants = await this.getConversationParticipants(data.conversationId)

      const updateData = {
        callId: data.callId,
        conversationId: data.conversationId,
        speaker: {
          userId,
          isSpeaking: data.isSpeaking,
        },
        timestamp,
      }

      participants.forEach((participant: ConversationParticipant) => {
        if (participant.userId !== userId) {
          sendToUser(participant.userId, {
            type: 'call:speaker_update',
            ...updateData,
          })
        }
      })
    } catch (error) {
      console.error('Error handling speaker update:', error)
    }
  }

  async handleOffer(userId: string, data: VoIPOfferMessage): Promise<void> {
    if (!data.conversationId || !data.offer) {
      sendToUser(userId, {
        type: 'error',
        message: 'Missing conversationId or offer',
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Validate SDP offer structure to prevent injection attacks
    if (!this.isValidSDP(data.offer)) {
      console.error('Invalid SDP offer received from user:', userId)
      sendToUser(userId, {
        type: 'error',
        message: 'Invalid offer format',
        timestamp: new Date().toISOString(),
      })
      return
    }

    try {
      // Verify user is participant of the conversation
      const participants = await this.getConversationParticipants(data.conversationId)
      const isParticipant = participants.some((p: ConversationParticipant) => p.userId === userId)

      if (!isParticipant) {
        console.warn(
          `User ${userId} attempted to send offer for conversation ${data.conversationId} but is not a participant`
        )
        sendToUser(userId, {
          type: 'error',
          message: 'Not authorized for this conversation',
          timestamp: new Date().toISOString(),
        })
        return
      }

      const offerMessage = {
        type: 'voip:offer' as const,
        offer: data.offer,
        conversationId: data.conversationId,
        callId: data.callId,
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      }

      // Direct peer-to-peer with authorization check
      if (data.targetUserId) {
        const isTargetParticipant = participants.some(
          (p: ConversationParticipant) => p.userId === data.targetUserId
        )
        if (!isTargetParticipant) {
          console.warn(
            `User ${userId} attempted to send offer to non-participant ${data.targetUserId}`
          )
          return
        }
        sendToUser(data.targetUserId, offerMessage)
        return
      }

      participants.forEach((participant: ConversationParticipant) => {
        if (participant.userId !== userId) {
          sendToUser(participant.userId, offerMessage)
        }
      })
    } catch (error) {
      console.error('Error handling VoIP offer:', error)
    }
  }

  async handleAnswer(userId: string, data: VoIPAnswerMessage): Promise<void> {
    if (!data.conversationId || !data.answer) {
      sendToUser(userId, {
        type: 'error',
        message: 'Missing conversationId or answer',
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Validate SDP answer structure to prevent injection attacks
    if (!this.isValidSDP(data.answer)) {
      console.error('Invalid SDP answer received from user:', userId)
      sendToUser(userId, {
        type: 'error',
        message: 'Invalid answer format',
        timestamp: new Date().toISOString(),
      })
      return
    }

    try {
      // Verify user is participant of the conversation
      const participants = await this.getConversationParticipants(data.conversationId)
      const isParticipant = participants.some((p: ConversationParticipant) => p.userId === userId)

      if (!isParticipant) {
        console.warn(
          `User ${userId} attempted to send answer for conversation ${data.conversationId} but is not a participant`
        )
        sendToUser(userId, {
          type: 'error',
          message: 'Not authorized for this conversation',
          timestamp: new Date().toISOString(),
        })
        return
      }

      const answerMessage = {
        type: 'voip:answer' as const,
        answer: data.answer,
        conversationId: data.conversationId,
        callId: data.callId,
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      }

      // Direct peer-to-peer with authorization check
      if (data.targetUserId) {
        const isTargetParticipant = participants.some(
          (p: ConversationParticipant) => p.userId === data.targetUserId
        )
        if (!isTargetParticipant) {
          console.warn(
            `User ${userId} attempted to send answer to non-participant ${data.targetUserId}`
          )
          return
        }
        sendToUser(data.targetUserId, answerMessage)
        return
      }

      participants.forEach((participant: ConversationParticipant) => {
        if (participant.userId !== userId) {
          sendToUser(participant.userId, answerMessage)
        }
      })
    } catch (error) {
      console.error('Error handling VoIP answer:', error)
    }
  }

  async handleIceCandidate(userId: string, data: VoIPIceCandidateMessage): Promise<void> {
    if (!data.conversationId || !data.candidate) {
      return
    }

    // Validate ICE candidate structure
    if (!this.isValidIceCandidate(data.candidate)) {
      console.error('Invalid ICE candidate received from user:', userId)
      return
    }

    try {
      // Verify user is participant of the conversation
      const participants = await this.getConversationParticipants(data.conversationId)
      const isParticipant = participants.some((p: ConversationParticipant) => p.userId === userId)

      if (!isParticipant) {
        console.warn(
          `User ${userId} attempted to send ICE candidate for conversation ${data.conversationId} but is not a participant`
        )
        return
      }

      const candidateMessage = {
        type: 'voip:ice_candidate' as const,
        candidate: data.candidate,
        conversationId: data.conversationId,
        callId: data.callId,
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      }

      // Direct peer-to-peer with authorization check
      if (data.targetUserId) {
        const isTargetParticipant = participants.some(
          (p: ConversationParticipant) => p.userId === data.targetUserId
        )
        if (!isTargetParticipant) {
          console.warn(
            `User ${userId} attempted to send ICE candidate to non-participant ${data.targetUserId}`
          )
          return
        }
        sendToUser(data.targetUserId, candidateMessage)
        return
      }

      // Broadcast to all participants
      participants.forEach((participant: ConversationParticipant) => {
        if (participant.userId !== userId) {
          sendToUser(participant.userId, candidateMessage)
        }
      })
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
    }
  }

  async handleMuteStatus(userId: string, data: VoIPMuteStatusMessage): Promise<void> {
    if (!data.conversationId || !data.callId) {
      return
    }

    try {
      // Verify user is participant of the conversation
      const participants = await this.getConversationParticipants(data.conversationId)
      const isParticipant = participants.some((p: ConversationParticipant) => p.userId === userId)

      if (!isParticipant) {
        console.warn(
          `User ${userId} attempted to send mute status for conversation ${data.conversationId} but is not a participant`
        )
        return
      }

      const muteStatusMessage = {
        type: 'call:mute_status' as const,
        conversationId: data.conversationId,
        callId: data.callId,
        isMuted: data.isMuted,
        fromUserId: userId,
        timestamp: new Date().toISOString(),
      }

      // Broadcast to all other participants
      participants.forEach((participant: ConversationParticipant) => {
        if (participant.userId !== userId) {
          sendToUser(participant.userId, muteStatusMessage)
        }
      })
    } catch (error) {
      console.error('Error handling mute status:', error)
    }
  }

  // handleCallJoin / handleCallLeave / handleHeartbeat / handleMetricsBatch
  // removed — the dedicated /api/call WebSocket (call-ws.manager.ts) owns
  // active-call lifecycle, and metrics use POST /api/calls/:callId/metrics.

  // Validate SDP structure to prevent injection attacks
  private isValidSDP(sdp: RTCSessionDescriptionInit): boolean {
    if (!sdp || typeof sdp !== 'object') return false
    if (!sdp.type || !sdp.sdp) return false
    if (!['offer', 'answer', 'pranswer', 'rollback'].includes(sdp.type)) return false

    // Basic SDP format validation
    const sdpString = sdp.sdp
    if (typeof sdpString !== 'string' || sdpString.length === 0) return false

    // Check for required SDP fields
    const hasVersion = sdpString.includes('v=')
    const hasOrigin = sdpString.includes('o=')
    const hasSessionName = sdpString.includes('s=')

    // Reject if missing critical fields
    if (!hasVersion || !hasOrigin || !hasSessionName) return false

    // Check for suspicious patterns that could indicate injection attempts
    const suspiciousPatterns = [/<script/i, /javascript:/i, /onerror=/i, /onclick=/i, /eval\(/i]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sdpString)) {
        console.error('Suspicious pattern detected in SDP:', pattern)
        return false
      }
    }

    return true
  }

  // Validate ICE candidate structure
  private isValidIceCandidate(candidate: RTCIceCandidateInit): boolean {
    if (!candidate || typeof candidate !== 'object') return false

    // Basic validation
    if (typeof candidate.candidate !== 'string') return false

    // Empty candidate string is valid (end-of-candidates indication)
    if (candidate.candidate === '') return true

    // Check for required ICE candidate fields
    const candidateString = candidate.candidate
    const hasCandidate = candidateString.includes('candidate:')

    if (!hasCandidate) return false

    // Check for suspicious patterns
    const suspiciousPatterns = [/<script/i, /javascript:/i, /eval\(/i]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(candidateString)) {
        console.error('Suspicious pattern detected in ICE candidate:', pattern)
        return false
      }
    }

    return true
  }
}

export const voipService = new VoIPService()
