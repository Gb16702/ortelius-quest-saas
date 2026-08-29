import { and, eq, inArray, ne, or, sql } from 'drizzle-orm'
import { db } from '../../../../infrastructure/database'
import { member, user } from '../../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  message,
  messageRead,
} from '../../../../infrastructure/database/db/schemas/chat-schema'
import type {
  MessageReadConversationAccess,
  MessageReadMessageRecord,
  MessageReadReaderProfile,
  MessageReadStatusRow,
} from '../application/message-read-models'
import type { MessageReadRepositoryPort } from '../application/ports'

export class DrizzleMessageReadRepository implements MessageReadRepositoryPort {
  async getMessage(messageId: string): Promise<MessageReadMessageRecord | null> {
    const [row] = await db
      .select({
        id: message.id,
        senderId: message.senderId,
        conversationId: message.conversationId,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .limit(1)

    return row ?? null
  }

  async getConversationAccess(
    conversationId: string,
    userId: string
  ): Promise<MessageReadConversationAccess | null> {
    const [row] = await db
      .select({
        organizationId: conversation.organizationId,
        requesterId: conversation.requesterId,
      })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    if (!row) {
      return null
    }

    const isRequester = userId === row.requesterId
    const isOrgMember =
      !isRequester &&
      (await db
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.organizationId, row.organizationId), eq(member.userId, userId)))
        .limit(1)
        .then((result) => result.length > 0))

    return {
      organizationId: row.organizationId,
      requesterId: row.requesterId,
      isRequester,
      isOrgMember,
    }
  }

  async hasMessageRead(messageId: string, userId: string): Promise<boolean> {
    const existingRead = await db
      .select({ id: messageRead.id })
      .from(messageRead)
      .where(and(eq(messageRead.messageId, messageId), eq(messageRead.userId, userId)))
      .limit(1)

    return existingRead.length > 0
  }

  async insertMessageRead(messageId: string, userId: string): Promise<void> {
    await db.insert(messageRead).values({
      messageId,
      userId,
    })
  }

  async insertMessageReads(entries: Array<{ messageId: string; userId: string }>): Promise<void> {
    if (entries.length === 0) {
      return
    }

    await db.insert(messageRead).values(entries)
  }

  async getUnreadMessagesForConversation(
    conversationId: string,
    userId: string
  ): Promise<Array<{ id: string }>> {
    return await db
      .select({ id: message.id })
      .from(message)
      .leftJoin(
        messageRead,
        and(eq(messageRead.messageId, message.id), eq(messageRead.userId, userId))
      )
      .where(
        and(
          eq(message.conversationId, conversationId),
          sql`${messageRead.id} IS NULL`,
          or(ne(message.senderId, userId), eq(message.messageType, 'system'))
        )
      )
  }

  async getMessagesByIds(messageIds: string[]): Promise<MessageReadMessageRecord[]> {
    if (messageIds.length === 0) {
      return []
    }

    return await db
      .select({
        id: message.id,
        senderId: message.senderId,
        conversationId: message.conversationId,
      })
      .from(message)
      .where(inArray(message.id, messageIds))
  }

  async getReaderInfo(userId: string): Promise<MessageReadReaderProfile | null> {
    const [row] = await db
      .select({
        userId: user.id,
        userName: user.name,
        userImage: user.image,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return row ?? null
  }

  async getConversationReadStatusRows(conversationId: string): Promise<MessageReadStatusRow[]> {
    return await db
      .select({
        messageId: message.id,
        senderId: message.senderId,
        createdAt: message.createdAt,
        readAt: messageRead.readAt,
        readByUserId: messageRead.userId,
        readByUserName: user.name,
        readByUserImage: user.image,
      })
      .from(message)
      .leftJoin(messageRead, eq(messageRead.messageId, message.id))
      .leftJoin(user, eq(messageRead.userId, user.id))
      .where(eq(message.conversationId, conversationId))
      .orderBy(sql`${message.createdAt} ASC`)
  }
}

export const messageReadRepository = new DrizzleMessageReadRepository()
