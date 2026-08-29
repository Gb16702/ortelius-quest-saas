import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { EmailService } from '../../../../../emails/services/email.service'
import { EmailTemplate } from '../../../../../emails/types'
import { buildAuthLink } from '../../../../infrastructure/auth/auth-link'
import { db } from '../../../../infrastructure/database'
import {
  anonymousUser,
  member,
  organization,
  user,
} from '../../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
  message,
  messageReaction,
} from '../../../../infrastructure/database/db/schemas/chat-schema'
import {
  activeConversations,
  sendToUsers,
} from '../../../../infrastructure/messaging/websocket.service'
import {
  decryptContent,
  encryptContent,
} from '../../../../infrastructure/security/encryption.service'
import { documentsApplicationService } from '../../../documents/documents.application'
import { memberMetricsService } from '../../../metrics/services/member-metrics.service'
import { notificationApplicationService } from '../../../notifications/notifications.application'
import type {
  AddReactionData,
  Attachment,
  CreateSystemMessageData,
  Message,
  MessageReaction,
  MessageRepository,
  MessageWithSender,
  SendMessageData,
} from '../../domain/messaging.types'

export function decryptMessageContent(content: string): string {
  return decryptContent(content)
}

export async function populateAttachmentUrls(
  metadata: Record<string, unknown> | null
): Promise<Record<string, unknown> | null> {
  if (!metadata || !metadata.attachments || !Array.isArray(metadata.attachments)) {
    return metadata
  }

  const attachmentsWithUrls = await Promise.all(
    (metadata.attachments as Attachment[]).map(async (attachment) => {
      try {
        const viewUrl = await documentsApplicationService.generateSignedUrl(attachment.s3Key, 3600)
        const downloadUrl = await documentsApplicationService.generateSignedUrl(
          attachment.s3Key,
          3600,
          attachment.originalName
        )
        return {
          ...attachment,
          url: viewUrl,
          downloadUrl,
        }
      } catch (error) {
        console.error(`Failed to generate signed URL for ${attachment.s3Key}:`, error)
        return attachment
      }
    })
  )

  return {
    ...metadata,
    attachments: attachmentsWithUrls,
  }
}

async function populateReplyToContext(
  messages: Array<{ replyToId?: string | null; [key: string]: unknown }>
): Promise<
  Map<
    string,
    {
      id: string
      senderId: string
      senderName: string
      senderImage?: string | null
      content: string
      messageType: string
      createdAt: Date
      isDeleted?: boolean
    }
  >
> {
  const replyToIds = messages
    .map((msg) => msg.replyToId)
    .filter((id): id is string => id != null && id !== '')

  if (replyToIds.length === 0) {
    return new Map()
  }

  const replyToMessages = await db
    .select({
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      isDeleted: message.isDeleted,
      senderName: user.name,
      senderImage: user.image,
    })
    .from(message)
    .innerJoin(user, eq(message.senderId, user.id))
    .where(inArray(message.id, replyToIds))

  return new Map(
    replyToMessages.map((msg) => [
      msg.id,
      {
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderImage: msg.senderImage,
        content: decryptContent(msg.content),
        messageType: msg.messageType,
        createdAt: msg.createdAt,
        isDeleted: msg.isDeleted,
      },
    ])
  )
}

/**
 * Read-only access check: is `userId` allowed to see / interact with
 * `conversationId`? No side effects, can be called from any route. Use
 * `ensureConversationAccess` (the MessageService method) when you also want
 * the caller to be auto-joined as a participant on success — that's only
 * appropriate for sendMessage, where joining a conversation by speaking in
 * it is the explicit semantics.
 */
export async function canAccessConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const participant = await db
    .select({ id: conversationParticipant.id })
    .from(conversationParticipant)
    .where(
      and(
        eq(conversationParticipant.conversationId, conversationId),
        eq(conversationParticipant.userId, userId),
        isNull(conversationParticipant.leftAt)
      )
    )
    .limit(1)

  if (participant.length > 0) return true

  // Org members of an org conversation are implicit participants — same
  // semantics as the auto-join in ensureConversationAccess, but read-only.
  const [conv] = await db
    .select({ organizationId: conversation.organizationId })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .limit(1)

  if (!conv?.organizationId) return false

  const [orgMembership] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, conv.organizationId)))
    .limit(1)

  return Boolean(orgMembership)
}

export class DrizzleMessageRepository implements MessageRepository {
  private async ensureConversationAccess(conversationId: string, userId: string): Promise<boolean> {
    const participant = await db
      .select()
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, userId),
          // Guard against the future "leave conversation" feature — a row
          // with leftAt set should not grant access. Today leftAt is never
          // populated, so this is purely defensive.
          isNull(conversationParticipant.leftAt)
        )
      )
      .limit(1)

    if (participant.length > 0) {
      return true
    }

    const conversationInfo = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    if (!conversationInfo.length || !conversationInfo[0].organizationId) {
      return false
    }

    const orgMembership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, conversationInfo[0].organizationId)
        )
      )
      .limit(1)

    if (orgMembership.length > 0) {
      await db.insert(conversationParticipant).values({
        conversationId,
        userId,
        role: 'member',
      })
      return true
    }

    return false
  }

  async sendMessage(data: SendMessageData): Promise<Message> {
    const hasAccess = await this.ensureConversationAccess(data.conversationId, data.senderId)

    if (!hasAccess) {
      throw new Error('User not authorized to send messages in this conversation')
    }

    let replyToContext = null
    if (data.replyToId) {
      // SECURITY: scope the reply target to the same conversation. Without
      // the conversationId filter, any user could quote-reply to a message
      // from a private conversation they don't have access to — the server
      // would dutifully load it, decrypt it, and broadcast the plaintext
      // inside replyToContext to every participant of the current conv.
      const replyToMessage = await db
        .select({
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          isDeleted: message.isDeleted,
          senderName: user.name,
          senderImage: user.image,
        })
        .from(message)
        .innerJoin(user, eq(message.senderId, user.id))
        .where(and(eq(message.id, data.replyToId), eq(message.conversationId, data.conversationId)))
        .limit(1)

      if (replyToMessage.length === 0) {
        // Don't leak whether the message exists in another conversation.
        throw new Error('Reply target message not found')
      }

      if (replyToMessage[0].isDeleted) {
        throw new Error('Cannot reply to deleted messages')
      }

      if (replyToMessage[0].messageType === 'system') {
        throw new Error('Cannot reply to system messages')
      }

      replyToContext = {
        id: replyToMessage[0].id,
        senderId: replyToMessage[0].senderId,
        senderName: replyToMessage[0].senderName,
        senderImage: replyToMessage[0].senderImage,
        content: decryptContent(replyToMessage[0].content),
        messageType: replyToMessage[0].messageType,
        createdAt: replyToMessage[0].createdAt,
      }
    }

    // One SELECT for everything we'll need from the conversation row across
    // this method. Pre-fix this was 3 separate round-trips for organizationId
    // (line ~230), name (line ~344), and anonymousRequesterId+organizationId
    // (line ~373).
    const [conversationRow] = await db
      .select({
        organizationId: conversation.organizationId,
        name: conversation.name,
        anonymousRequesterId: conversation.anonymousRequesterId,
      })
      .from(conversation)
      .where(eq(conversation.id, data.conversationId))
      .limit(1)

    const conversationData = conversationRow ? [conversationRow] : []

    const previousMessages = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.conversationId, data.conversationId), eq(message.senderId, data.senderId))
      )
      .limit(1)

    const isFirstMessage = previousMessages.length === 0

    const newMessage = await db
      .insert(message)
      .values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: encryptContent(data.content),
        messageType: data.messageType || 'text',
        replyToId: data.replyToId,
        metadata: data.metadata || null,
      })
      .returning()

    await db
      .update(conversation)
      .set({ updatedAt: new Date() })
      .where(eq(conversation.id, data.conversationId))

    if (conversationData.length > 0 && conversationData[0].organizationId) {
      try {
        if (isFirstMessage) {
          await memberMetricsService.incrementMemberConversation(
            data.senderId,
            conversationData[0].organizationId
          )
        }

        await memberMetricsService.incrementMemberMessage(
          data.senderId,
          conversationData[0].organizationId
        )
      } catch (error) {
        console.error('Failed to update metrics for message:', error)
      }
    }

    const participants = await db
      .select({ userId: conversationParticipant.userId })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, data.conversationId),
          isNull(conversationParticipant.leftAt)
        )
      )

    const participantIds = participants.map((p) => p.userId)

    const senderInfo = await db
      .select({
        name: user.name,
        image: user.image,
        organizationName: organization.name,
        memberRole: member.role,
      })
      .from(user)
      .leftJoin(
        member,
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, conversationData[0]?.organizationId || '')
        )
      )
      .leftJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(user.id, data.senderId))
      .limit(1)

    // Sign attachment URLs before broadcasting; without this, recipients see an
    // empty message until they refresh and getMessages re-populates the URLs.
    const broadcastMetadata = await populateAttachmentUrls(
      (data.metadata as Record<string, unknown> | null) ?? null
    )

    const wsMessage = {
      type: 'message:new',
      data: {
        id: newMessage[0].id,
        content: data.content,
        senderId: data.senderId,
        conversationId: data.conversationId,
        messageType: data.messageType || 'text',
        replyToId: data.replyToId,
        replyTo: replyToContext,
        metadata: broadcastMetadata,
        createdAt: newMessage[0].createdAt,
        updatedAt: newMessage[0].updatedAt,
        senderName: senderInfo[0]?.name,
        senderImage: senderInfo[0]?.image,
        organizationName: senderInfo[0]?.organizationName,
        memberRole: senderInfo[0]?.memberRole,
      },
      conversationId: data.conversationId,
      timestamp: new Date().toISOString(),
    }

    // Skip the sender — they already added the message locally from the
    // POST response, and the frontend filters their own broadcasts out
    // anyway (chat-page-provider.tsx). Saves one WS round-trip per send.
    const otherParticipants = participantIds.filter((id) => id !== data.senderId)
    sendToUsers(otherParticipants, wsMessage)

    if (senderInfo.length > 0) {
      const senderName = senderInfo[0].name
      const senderImage = senderInfo[0].image
      const conversationName = conversationRow?.name

      otherParticipants.forEach(async (participantId) => {
        const isViewingConversation = activeConversations.get(participantId) === data.conversationId

        if (!isViewingConversation) {
          await notificationApplicationService.notifyNewMessage(participantId, {
            conversationId: data.conversationId,
            messageId: newMessage[0].id,
            senderId: data.senderId,
            senderName,
            senderImage,
            content: data.content,
            conversationName: conversationName || undefined,
            metadata: data.metadata,
          })
        }
      })
    }

    if (conversationRow?.anonymousRequesterId) {
      const anonymousUserData = await db
        .select({ email: anonymousUser.email, name: anonymousUser.name })
        .from(anonymousUser)
        .where(eq(anonymousUser.id, conversationRow.anonymousRequesterId))
        .limit(1)

      if (anonymousUserData.length > 0 && senderInfo.length > 0) {
        try {
          const { organization } = await import(
            '../../../../infrastructure/database/db/schemas/auth-schema'
          )

          const orgInfo = await db
            .select({
              slug: organization.slug,
              name: organization.name,
            })
            .from(organization)
            .where(eq(organization.id, conversationRow?.organizationId ?? ''))
            .limit(1)

          if (orgInfo.length > 0 && orgInfo[0].slug) {
            const signupLink = buildAuthLink({
              email: anonymousUserData[0].email,
              redirectPath: `/org/${orgInfo[0].slug}/signup`,
            })

            await EmailService.sendTemplatedEmail(
              EmailTemplate.CHAT_MESSAGE_ANONYMOUS,
              {
                username: anonymousUserData[0].name,
                senderName: senderInfo[0].name,
                messageContent: data.content,
                conversationName: orgInfo[0].name,
                signupLink,
              },
              {
                to: anonymousUserData[0].email,
                subject: `New message from ${senderInfo[0].name}`,
                organizationId: conversationRow?.organizationId ?? '',
              }
            )
          }
        } catch (error) {
          console.error('Failed to send email notification to anonymous user:', error)
        }
      }
    }

    return {
      ...newMessage[0],
      metadata: newMessage[0].metadata as Record<string, unknown> | null,
    }
  }

  async getAllConversationMessages(
    conversationId: string,
    userId: string
  ): Promise<{ messages: MessageWithSender[]; total: number }> {
    const hasAccess = await this.ensureConversationAccess(conversationId, userId)

    if (!hasAccess) {
      throw new Error('Unauthorized access to this conversation')
    }

    const conversationInfo = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    const [messages, totalResult] = await Promise.all([
      db
        .select({
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          senderId: message.senderId,
          senderName: user.name,
          senderImage: user.image,
          organizationName: organization.name,
          memberRole: member.role,
          replyToId: message.replyToId,
          metadata: message.metadata,
          isEdited: message.isEdited,
          isDeleted: message.isDeleted,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        })
        .from(message)
        .innerJoin(user, eq(message.senderId, user.id))
        .leftJoin(
          member,
          and(
            eq(member.userId, user.id),
            eq(member.organizationId, conversationInfo[0]?.organizationId || '')
          )
        )
        .leftJoin(organization, eq(organization.id, member.organizationId))
        .where(eq(message.conversationId, conversationId))
        .orderBy(asc(message.createdAt)),
      db
        .select({ count: message.id })
        .from(message)
        .where(eq(message.conversationId, conversationId)),
    ])

    const total = totalResult.length

    const replyToMap = await populateReplyToContext(messages)

    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        content: decryptContent(msg.content),
        messageType: msg.messageType,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderImage: msg.senderImage,
        organizationName: msg.organizationName,
        memberRole: msg.memberRole,
        replyToId: msg.replyToId,
        metadata: await populateAttachmentUrls(msg.metadata as Record<string, unknown> | null),
        isEdited: msg.isEdited,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        replyTo: msg.replyToId ? replyToMap.get(msg.replyToId) || null : null,
      }))
    )

    return {
      messages: messagesWithUrls,
      total,
    }
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: MessageWithSender[]; total: number }> {
    const hasAccess = await this.ensureConversationAccess(conversationId, userId)

    if (!hasAccess) {
      throw new Error('Unauthorized access to this conversation')
    }

    const conversationInfo = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    const [messages, totalResult] = await Promise.all([
      db
        .select({
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          senderId: message.senderId,
          senderName: user.name,
          senderImage: user.image,
          organizationName: organization.name,
          memberRole: member.role,
          replyToId: message.replyToId,
          metadata: message.metadata,
          isEdited: message.isEdited,
          isDeleted: message.isDeleted,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        })
        .from(message)
        .innerJoin(user, eq(message.senderId, user.id))
        .leftJoin(
          member,
          and(
            eq(member.userId, user.id),
            eq(member.organizationId, conversationInfo[0]?.organizationId || '')
          )
        )
        .leftJoin(organization, eq(organization.id, member.organizationId))
        .where(and(eq(message.conversationId, conversationId), eq(message.isDeleted, false)))
        .orderBy(desc(message.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: message.id })
        .from(message)
        .where(and(eq(message.conversationId, conversationId), eq(message.isDeleted, false))),
    ])

    const total = totalResult.length

    const replyToMap = await populateReplyToContext(messages)

    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        content: decryptContent(msg.content),
        messageType: msg.messageType,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderImage: msg.senderImage,
        organizationName: msg.organizationName,
        memberRole: msg.memberRole,
        replyToId: msg.replyToId,
        metadata: await populateAttachmentUrls(msg.metadata as Record<string, unknown> | null),
        isEdited: msg.isEdited,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        replyTo: msg.replyToId ? replyToMap.get(msg.replyToId) || null : null,
      }))
    )

    return {
      messages: messagesWithUrls,
      total,
    }
  }

  async addReaction(data: AddReactionData): Promise<MessageReaction> {
    // Authorize BEFORE inserting. Pre-fix the row was inserted unconditionally
    // and only afterwards did we look up the message's conversation — meaning
    // any user with a guessed messageId could plant reactions on private
    // messages they couldn't otherwise see.
    const [messageInfo] = await db
      .select({ conversationId: message.conversationId })
      .from(message)
      .where(eq(message.id, data.messageId))
      .limit(1)

    if (!messageInfo) {
      throw new Error('Message not found')
    }

    const allowed = await canAccessConversation(messageInfo.conversationId, data.userId)
    if (!allowed) {
      throw new Error('You are not a participant of this conversation')
    }

    const reaction = await db.insert(messageReaction).values(data).returning()

    const participants = await db
      .select({ userId: conversationParticipant.userId })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, messageInfo.conversationId),
          isNull(conversationParticipant.leftAt)
        )
      )

    const participantIds = participants.map((p) => p.userId)
    const wsMessage = {
      // Aligned with the colon-separated event-type convention (PR #20).
      // The old `reaction_added` / `reaction_removed` types pre-dated the
      // unification and were the last legacy snake_case events still alive.
      type: 'reaction:added',
      data: reaction[0],
      messageId: data.messageId,
      conversationId: messageInfo.conversationId,
      timestamp: new Date().toISOString(),
    }

    sendToUsers(participantIds, wsMessage)

    return reaction[0]
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageReaction[]> {
    const [messageInfo] = await db
      .select({ conversationId: message.conversationId })
      .from(message)
      .where(eq(message.id, messageId))
      .limit(1)

    if (!messageInfo) {
      throw new Error('Message not found')
    }

    // Same rationale as addReaction: don't let a guessed messageId in a
    // private conversation be used to delete things via this path.
    const allowed = await canAccessConversation(messageInfo.conversationId, userId)
    if (!allowed) {
      throw new Error('You are not a participant of this conversation')
    }

    const deleted = await db
      .delete(messageReaction)
      .where(
        and(
          eq(messageReaction.messageId, messageId),
          eq(messageReaction.userId, userId),
          eq(messageReaction.emoji, emoji)
        )
      )
      .returning()

    if (deleted.length > 0) {
      const participants = await db
        .select({ userId: conversationParticipant.userId })
        .from(conversationParticipant)
        .where(
          and(
            eq(conversationParticipant.conversationId, messageInfo.conversationId),
            isNull(conversationParticipant.leftAt)
          )
        )

      const participantIds = participants.map((p) => p.userId)
      const wsMessage = {
        type: 'reaction:removed',
        messageId,
        userId,
        emoji,
        conversationId: messageInfo.conversationId,
        timestamp: new Date().toISOString(),
      }

      sendToUsers(participantIds, wsMessage)
    }

    return deleted
  }

  async createSystemMessage(data: CreateSystemMessageData): Promise<Message> {
    const newMessage = await db
      .insert(message)
      .values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: encryptContent(data.content),
        messageType: 'system',
        metadata: data.metadata || null,
      })
      .returning()

    await db
      .update(conversation)
      .set({ updatedAt: new Date() })
      .where(eq(conversation.id, data.conversationId))

    const participants = await db
      .select({ userId: conversationParticipant.userId })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, data.conversationId),
          isNull(conversationParticipant.leftAt)
        )
      )

    const participantIds = participants.map((p) => p.userId)
    const wsMessage = {
      type: 'system_message',
      data: {
        ...newMessage[0],
        content: data.content,
        metadata: data.metadata || null,
      },
      conversationId: data.conversationId,
      timestamp: new Date().toISOString(),
    }

    sendToUsers(participantIds, wsMessage)

    return {
      ...newMessage[0],
      metadata: newMessage[0].metadata as Record<string, unknown> | null,
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<{ conversationId: string }> {
    const msg = await db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        createdAt: message.createdAt,
        isDeleted: message.isDeleted,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .limit(1)

    if (msg.length === 0) {
      throw new Error('Message not found')
    }

    if (msg[0].isDeleted) {
      throw new Error('Message already deleted')
    }

    const participant = await db
      .select()
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, msg[0].conversationId),
          eq(conversationParticipant.userId, userId),
          isNull(conversationParticipant.leftAt)
        )
      )
      .limit(1)

    if (participant.length === 0) {
      throw new Error('User not authorized to delete messages in this conversation')
    }

    if (msg[0].senderId !== userId) {
      throw new Error('Only the message sender can delete this message')
    }

    const now = new Date()
    const messageAge = now.getTime() - new Date(msg[0].createdAt).getTime()
    const fifteenMinutes = 15 * 60 * 1000

    if (messageAge > fifteenMinutes) {
      throw new Error('Messages can only be deleted within 15 minutes of sending')
    }

    await db
      .update(message)
      .set({
        isDeleted: true,
        updatedAt: now,
      })
      .where(eq(message.id, messageId))

    return { conversationId: msg[0].conversationId }
  }

  async editMessage(messageId: string, userId: string, newContent: string): Promise<Message> {
    const msg = await db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        createdAt: message.createdAt,
        isDeleted: message.isDeleted,
        metadata: message.metadata,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .limit(1)

    if (msg.length === 0) {
      throw new Error('Message not found')
    }

    if (msg[0].isDeleted) {
      throw new Error('Cannot edit a deleted message')
    }

    const participant = await db
      .select()
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, msg[0].conversationId),
          eq(conversationParticipant.userId, userId),
          isNull(conversationParticipant.leftAt)
        )
      )
      .limit(1)

    if (participant.length === 0) {
      throw new Error('User not authorized to edit messages in this conversation')
    }

    if (msg[0].senderId !== userId) {
      throw new Error('Only the message sender can edit this message')
    }

    const now = new Date()
    const messageAge = now.getTime() - new Date(msg[0].createdAt).getTime()
    const fifteenMinutes = 15 * 60 * 1000

    if (messageAge > fifteenMinutes) {
      throw new Error('Messages can only be edited within 15 minutes of sending')
    }

    const updatedMessage = await db
      .update(message)
      .set({
        content: encryptContent(newContent),
        isEdited: true,
        updatedAt: now,
      })
      .where(eq(message.id, messageId))
      .returning()

    return {
      ...updatedMessage[0],
      metadata: updatedMessage[0].metadata as Record<string, unknown> | null,
    }
  }

  async pinMessage(messageId: string, userId: string): Promise<Message> {
    const msg = await db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        isPinned: message.isPinned,
        isDeleted: message.isDeleted,
        messageType: message.messageType,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .limit(1)

    if (msg.length === 0) {
      throw new Error('Message not found')
    }

    if (msg[0].isDeleted) {
      throw new Error('Cannot pin a deleted message')
    }

    if (msg[0].messageType === 'system') {
      throw new Error('Cannot pin system messages')
    }

    if (msg[0].isPinned) {
      throw new Error('Message is already pinned')
    }

    const hasAccess = await this.ensureConversationAccess(msg[0].conversationId, userId)

    if (!hasAccess) {
      throw new Error('User not authorized to pin messages in this conversation')
    }

    const pinnedCount = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.conversationId, msg[0].conversationId), eq(message.isPinned, true)))

    if (pinnedCount.length >= 10) {
      throw new Error('Maximum of 10 pinned messages per conversation')
    }

    const updatedMessage = await db
      .update(message)
      .set({
        isPinned: true,
        pinnedAt: new Date(),
        pinnedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(message.id, messageId))
      .returning()

    const pinnerInfo = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    const pinnerName = pinnerInfo[0]?.name || 'Someone'

    await this.createSystemMessage({
      conversationId: msg[0].conversationId,
      senderId: userId,
      content: `${pinnerName} pinned a message to this channel.`,
      metadata: {
        type: 'message_pinned',
        pinnedMessageId: messageId,
        pinnedByName: pinnerName,
      },
    })

    const participants = await db
      .select({ userId: conversationParticipant.userId })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, msg[0].conversationId),
          isNull(conversationParticipant.leftAt)
        )
      )

    const participantIds = participants.map((p) => p.userId)
    const wsMessage = {
      type: 'message_pinned',
      messageId,
      conversationId: msg[0].conversationId,
      pinnedById: userId,
      timestamp: new Date().toISOString(),
    }

    sendToUsers(participantIds, wsMessage)

    return {
      ...updatedMessage[0],
      metadata: updatedMessage[0].metadata as Record<string, unknown> | null,
    }
  }

  async unpinMessage(messageId: string, userId: string): Promise<Message> {
    const msg = await db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        isPinned: message.isPinned,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .limit(1)

    if (msg.length === 0) {
      throw new Error('Message not found')
    }

    if (!msg[0].isPinned) {
      throw new Error('Message is not pinned')
    }

    const hasAccess = await this.ensureConversationAccess(msg[0].conversationId, userId)

    if (!hasAccess) {
      throw new Error('User not authorized to unpin messages in this conversation')
    }

    const isMessageAuthor = msg[0].senderId === userId

    if (!isMessageAuthor) {
      const conversationInfo = await db
        .select({ organizationId: conversation.organizationId })
        .from(conversation)
        .where(eq(conversation.id, msg[0].conversationId))
        .limit(1)

      if (conversationInfo.length > 0 && conversationInfo[0].organizationId) {
        const userMembership = await db
          .select({ role: member.role })
          .from(member)
          .where(
            and(
              eq(member.userId, userId),
              eq(member.organizationId, conversationInfo[0].organizationId)
            )
          )
          .limit(1)

        const isAdminOrOwner =
          userMembership.length > 0 &&
          (userMembership[0].role === 'admin' || userMembership[0].role === 'owner')

        if (!isAdminOrOwner) {
          throw new Error('Only the message author or an admin/owner can unpin this message')
        }
      } else {
        throw new Error('Only the message author can unpin this message')
      }
    }

    const updatedMessage = await db
      .update(message)
      .set({
        isPinned: false,
        pinnedAt: null,
        pinnedById: null,
        updatedAt: new Date(),
      })
      .where(eq(message.id, messageId))
      .returning()

    const participants = await db
      .select({ userId: conversationParticipant.userId })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, msg[0].conversationId),
          isNull(conversationParticipant.leftAt)
        )
      )

    const participantIds = participants.map((p) => p.userId)
    const wsMessage = {
      type: 'message_unpinned',
      messageId,
      conversationId: msg[0].conversationId,
      unpinnedById: userId,
      timestamp: new Date().toISOString(),
    }

    sendToUsers(participantIds, wsMessage)

    return {
      ...updatedMessage[0],
      metadata: updatedMessage[0].metadata as Record<string, unknown> | null,
    }
  }

  async getPinnedMessages(conversationId: string, userId: string): Promise<MessageWithSender[]> {
    const hasAccess = await this.ensureConversationAccess(conversationId, userId)

    if (!hasAccess) {
      throw new Error('Unauthorized access to this conversation')
    }

    const conversationInfo = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    const messages = await db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId,
        senderName: user.name,
        senderImage: user.image,
        organizationName: organization.name,
        memberRole: member.role,
        replyToId: message.replyToId,
        metadata: message.metadata,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        isPinned: message.isPinned,
        pinnedAt: message.pinnedAt,
        pinnedById: message.pinnedById,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })
      .from(message)
      .innerJoin(user, eq(message.senderId, user.id))
      .leftJoin(
        member,
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, conversationInfo[0]?.organizationId || '')
        )
      )
      .leftJoin(organization, eq(organization.id, member.organizationId))
      .where(
        and(
          eq(message.conversationId, conversationId),
          eq(message.isPinned, true),
          eq(message.isDeleted, false)
        )
      )
      .orderBy(desc(message.pinnedAt))

    const replyToMap = await populateReplyToContext(messages)

    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        content: decryptContent(msg.content),
        messageType: msg.messageType,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderImage: msg.senderImage,
        organizationName: msg.organizationName,
        memberRole: msg.memberRole,
        replyToId: msg.replyToId,
        metadata: await populateAttachmentUrls(msg.metadata as Record<string, unknown> | null),
        isEdited: msg.isEdited,
        isDeleted: msg.isDeleted,
        isPinned: msg.isPinned,
        pinnedAt: msg.pinnedAt,
        pinnedById: msg.pinnedById,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        replyTo: msg.replyToId ? replyToMap.get(msg.replyToId) || null : null,
      }))
    )

    return messagesWithUrls
  }

  async searchConversationMessages(
    conversationId: string,
    userId: string,
    searchQuery: string
  ): Promise<{ messages: MessageWithSender[]; total: number }> {
    const hasAccess = await this.ensureConversationAccess(conversationId, userId)

    if (!hasAccess) {
      throw new Error('Unauthorized access to this conversation')
    }

    const conversationInfo = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    const messages = await db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId,
        senderName: user.name,
        senderImage: user.image,
        organizationName: organization.name,
        memberRole: member.role,
        replyToId: message.replyToId,
        metadata: message.metadata,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })
      .from(message)
      .innerJoin(user, eq(message.senderId, user.id))
      .leftJoin(
        member,
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, conversationInfo[0]?.organizationId || '')
        )
      )
      .leftJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(message.conversationId, conversationId))
      .orderBy(desc(message.createdAt))

    const replyToMap = await populateReplyToContext(messages)

    const searchLower = searchQuery.toLowerCase()
    const filteredMessages = messages
      .map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        content: decryptContent(msg.content),
        messageType: msg.messageType,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderImage: msg.senderImage,
        organizationName: msg.organizationName,
        memberRole: msg.memberRole,
        replyToId: msg.replyToId,
        metadata: msg.metadata as Record<string, unknown> | null,
        isEdited: msg.isEdited,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        replyTo: msg.replyToId ? replyToMap.get(msg.replyToId) || null : null,
      }))
      .filter((msg) => msg.content.toLowerCase().includes(searchLower))

    return {
      messages: filteredMessages,
      total: filteredMessages.length,
    }
  }
}

export const messageRepository = new DrizzleMessageRepository()
