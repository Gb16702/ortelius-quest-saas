import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../../../../infrastructure/database'
import { conversationParticipant } from '../../../../infrastructure/database/db/schemas/chat-schema'
import {
  type MessageDeletedMessage,
  type MessageEditedMessage,
  sendToUsers,
} from '../../../../infrastructure/messaging/websocket.service'
import type { Message } from '../../domain/messaging.types'
import type { MessageBroadcastPort } from '../application/ports'

async function getActiveParticipantIds(conversationId: string): Promise<string[]> {
  const participants = await db
    .select({ userId: conversationParticipant.userId })
    .from(conversationParticipant)
    .where(
      and(
        eq(conversationParticipant.conversationId, conversationId),
        isNull(conversationParticipant.leftAt)
      )
    )

  return participants.map((p) => p.userId).filter((id): id is string => id !== null)
}

export class WebsocketMessageBroadcastAdapter implements MessageBroadcastPort {
  async broadcastDeleted(input: {
    conversationId: string
    messageId: string
    now: Date
  }): Promise<void> {
    const participantUserIds = await getActiveParticipantIds(input.conversationId)
    const wsMessage: MessageDeletedMessage = {
      type: 'message:deleted',
      conversationId: input.conversationId,
      messageId: input.messageId,
      timestamp: input.now.toISOString(),
    }

    sendToUsers(participantUserIds, wsMessage)
  }

  async broadcastEdited(input: {
    conversationId: string
    message: Message
    decryptedContent: string
    now: Date
  }): Promise<void> {
    const participantUserIds = await getActiveParticipantIds(input.conversationId)
    const wsMessage: MessageEditedMessage = {
      type: 'message:edited',
      conversationId: input.conversationId,
      data: {
        id: input.message.id,
        content: input.decryptedContent,
        isEdited: input.message.isEdited,
        updatedAt: input.message.updatedAt.toISOString(),
      },
      timestamp: input.now.toISOString(),
    }

    sendToUsers(participantUserIds, wsMessage)
  }
}
