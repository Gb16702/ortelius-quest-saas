import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { isUserOnline, sendToUser } from '../../../infrastructure/messaging/websocket.service'
import { messageApplicationService as messageService } from '../../messaging/message/message.application'
import { notificationApplicationService } from '../../notifications/notifications.application'
import { callEvents } from '../domain/call-events.service'
import type { CallRecord } from '../domain/calls.types'
import { voipCallRepository } from './voip-call.repository'

let registered = false

async function getUserName(userId: string): Promise<string> {
  const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
  return row?.name || 'Someone'
}

async function getUserDisplay(userId: string): Promise<{ name: string; image: string | null }> {
  const [row] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return { name: row?.name || 'Someone', image: row?.image ?? null }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

async function postEndedSystemMessage(call: CallRecord, durationSec: number, endedBy: string) {
  const callTypeText = call.callType === 'video' ? 'Video call' : 'Call'
  await messageService.createSystemMessage({
    conversationId: call.conversationId,
    senderId: endedBy,
    content: `${callTypeText} ended • ${formatDuration(durationSec)}`,
    metadata: {
      type: 'call_summary',
      callId: call.id,
      duration: durationSec,
      callType: call.callType,
    },
  })
}

async function postMissedSystemMessage(call: CallRecord) {
  const callerName = await getUserName(call.callerId)
  const callTypeText = call.callType === 'video' ? 'video call' : 'call'
  await messageService.createSystemMessage({
    conversationId: call.conversationId,
    senderId: call.callerId,
    content: `Missed ${callTypeText} from ${callerName}`,
    metadata: {
      type: 'call_missed',
      callId: call.id,
      callType: call.callType,
    },
  })
}

export function registerCallEventHandlers(): void {
  if (registered) return
  registered = true

  callEvents.on('call.initiated', async (event) => {
    const caller = await getUserDisplay(event.callerId)
    const payload = {
      type: 'call:request' as const,
      callId: event.callId,
      conversationId: event.conversationId,
      callType: event.callType,
      fromUserId: event.callerId,
      fromUserName: caller.name,
      fromUserImage: caller.image,
      timestamp: new Date().toISOString(),
    }

    if (event.calleeId) {
      sendToUser(event.calleeId, payload as never)
      return
    }

    const orgMembers = await voipCallRepository.findOrgMembers(event.conversationId)
    for (const userId of orgMembers) {
      if (userId === event.callerId) continue
      if (!isUserOnline(userId)) continue
      sendToUser(userId, payload as never)
    }
  })

  callEvents.on('call.accepted', async (event) => {
    const accepter = await getUserDisplay(event.acceptedBy)
    sendToUser(event.callerId, {
      type: 'call:response',
      callId: event.callId,
      accepted: true,
      fromUserId: event.acceptedBy,
      fromUserName: accepter.name,
      fromUserImage: accepter.image,
      conversationId: event.conversationId,
      timestamp: new Date().toISOString(),
    } as never)

    if (event.previousCalleeId === null) {
      const orgMembers = await voipCallRepository.findOrgMembers(event.conversationId)
      for (const userId of orgMembers) {
        if (userId === event.callerId) continue
        if (userId === event.acceptedBy) continue
        if (!isUserOnline(userId)) continue
        sendToUser(userId, {
          type: 'call:cancelled',
          callId: event.callId,
          conversationId: event.conversationId,
          acceptedBy: event.acceptedBy,
          acceptedByName: accepter.name,
          timestamp: new Date().toISOString(),
        } as never)
      }
    }
  })

  callEvents.on('call.rejected', (event) => {
    sendToUser(event.callerId, {
      type: 'call:response',
      callId: event.callId,
      accepted: false,
      fromUserId: event.rejectedBy,
      conversationId: event.conversationId,
      timestamp: new Date().toISOString(),
    } as never)
  })

  callEvents.on('call.ended', async (event) => {
    const otherSide =
      event.endedBy === event.call.callerId ? event.call.calleeId : event.call.callerId
    if (otherSide) {
      sendToUser(otherSide, {
        type: 'call:end',
        callId: event.callId,
        conversationId: event.call.conversationId,
        fromUserId: event.endedBy,
        timestamp: new Date().toISOString(),
      } as never)
    }
    if (event.duration !== null) {
      await postEndedSystemMessage(event.call, event.duration, event.endedBy)
    }
  })

  callEvents.on('call.missed', async (event) => {
    const call = await voipCallRepository.findById(event.callId)
    if (!call) return

    const recipients = new Set<string>([call.callerId])
    if (call.calleeId) recipients.add(call.calleeId)
    for (const userId of recipients) {
      sendToUser(userId, {
        type: 'call:end',
        callId: call.id,
        conversationId: call.conversationId,
        fromUserId: call.callerId,
        reason: 'missed',
        timestamp: new Date().toISOString(),
      } as never)
    }

    await postMissedSystemMessage(call)
  })

  callEvents.on('call.recording_completed', async (event) => {
    const { voipCallRepository } = await import('./voip-call.repository')
    const call = await voipCallRepository.findById(event.callId)
    if (!call) return
    const recipients = [call.callerId, call.calleeId].filter(Boolean) as string[]
    for (const userId of recipients) {
      await notificationApplicationService.create(userId, {
        type: 'conversation_update',
        title: 'Call recording ready',
        message: 'The recording for your recent call is now available',
        data: {
          conversationId: event.conversationId,
          callId: event.callId,
          recordingUrl: event.recordingUrl,
        },
        timestamp: new Date().toISOString(),
        userId,
      })
    }
  })
}
