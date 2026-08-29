import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../../../../infrastructure/database'
import {
  member,
  organization,
  user,
} from '../../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
  message,
  messageRead,
} from '../../../../infrastructure/database/db/schemas/chat-schema'
import { request } from '../../../../infrastructure/database/db/schemas/request-schema'
import { decryptContent } from '../../../../infrastructure/security/encryption.service'
import type {
  ConversationRepository,
  ConversationSort,
  ConversationType,
  ConversationWithDetails,
} from '../../domain/messaging.types'
import type { ConversationRepositoryPort } from '../application/ports'
import { ConversationMemberDmForbiddenError } from '../domain'

function getConversationType(input: {
  isTeamChat: boolean
  requesterId?: string | null
  anonymousRequesterId?: string | null
}): ConversationType {
  if (input.isTeamChat) return 'team'
  if (!input.requesterId && !input.anonymousRequesterId) return 'member_dm'
  return 'requester'
}

export class DrizzleConversationRepository
  implements ConversationRepository, ConversationRepositoryPort
{
  async getUserConversations(
    userId: string,
    limit = 10,
    offset = 0,
    unreadOnly = false,
    searchQuery?: string,
    conversationType?: ConversationType,
    sort: ConversationSort = 'newest'
  ): Promise<{ conversations: ConversationWithDetails[]; total: number }> {
    type UserConversationRow = {
      id: string
      name: string | null
      description: string | null
      createdBy: string
      requesterId: string | null
      organizationId: string | null
      anonymousRequesterId: string | null
      isTeamChat: boolean
      createdAt: Date
      updatedAt: Date
      joinedAt: Date
      leftAt: Date | null
      role: string
      isPinned: boolean
      pinnedAt: Date | null
    }
    let userConversations: UserConversationRow[]
    let total: number

    if (unreadOnly) {
      const whereConditions = [eq(conversationParticipant.userId, userId)]

      const allUserConversations = await db
        .select({
          id: conversation.id,
          name: conversation.name,
          description: conversation.description,
          createdBy: conversation.createdBy,
          requesterId: conversation.requesterId,
          organizationId: conversation.organizationId,
          anonymousRequesterId: conversation.anonymousRequesterId,
          isTeamChat: conversation.isTeamChat,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          joinedAt: conversationParticipant.joinedAt,
          leftAt: conversationParticipant.leftAt,
          role: conversationParticipant.role,
          isPinned: conversationParticipant.isPinned,
          pinnedAt: conversationParticipant.pinnedAt,
        })
        .from(conversationParticipant)
        .innerJoin(conversation, eq(conversationParticipant.conversationId, conversation.id))
        .where(and(...whereConditions))
        .orderBy(desc(conversation.updatedAt))

      const allConversationIds = allUserConversations.map((conv) => conv.id)

      if (allConversationIds.length === 0) {
        return { conversations: [], total: 0 }
      }

      const unreadConversationIds = await this.getUnreadConversationIds(allConversationIds, userId)

      userConversations = allUserConversations.filter((conv) =>
        unreadConversationIds.includes(conv.id)
      )

      total = userConversations.length
    } else {
      const whereConditions = [eq(conversationParticipant.userId, userId)]

      const allConversations = await db
        .select({
          id: conversation.id,
          name: conversation.name,
          description: conversation.description,
          createdBy: conversation.createdBy,
          requesterId: conversation.requesterId,
          organizationId: conversation.organizationId,
          anonymousRequesterId: conversation.anonymousRequesterId,
          isTeamChat: conversation.isTeamChat,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          joinedAt: conversationParticipant.joinedAt,
          leftAt: conversationParticipant.leftAt,
          role: conversationParticipant.role,
          isPinned: conversationParticipant.isPinned,
          pinnedAt: conversationParticipant.pinnedAt,
        })
        .from(conversationParticipant)
        .innerJoin(conversation, eq(conversationParticipant.conversationId, conversation.id))
        .where(and(...whereConditions))
        .orderBy(desc(conversation.updatedAt))

      userConversations = allConversations
      total = allConversations.length
    }

    if (conversationType) {
      userConversations = userConversations.filter(
        (conv) => getConversationType(conv) === conversationType
      )
      total = userConversations.length
    }

    if (userConversations.length === 0) {
      return { conversations: [], total: 0 }
    }

    const conversationIds = userConversations.map((conv) => conv.id)

    const teamChatOrgIds = userConversations
      .filter((conv): conv is UserConversationRow & { organizationId: string } =>
        Boolean(conv.isTeamChat && conv.organizationId)
      )
      .map((conv) => conv.organizationId)

    // Pre-fix this section did 2 queries per conversation (one for the last
    // message, one for messageRead). With 100 conversations that was 200
    // round-trips on every chat-page load. Now it's 2 queries total: one
    // grouped last-message query, one batched messageRead lookup.
    const [lastMessages, messageCounts, participants, associatedRequests, teamChatOrgs] =
      await Promise.all([
        this.fetchLastMessagesGrouped(conversationIds, userId),

        db
          .select({
            conversationId: message.conversationId,
            count: count(message.id),
          })
          .from(message)
          .where(inArray(message.conversationId, conversationIds))
          .groupBy(message.conversationId),

        db
          .select({
            conversationId: conversationParticipant.conversationId,
            senderId: conversationParticipant.userId,
            senderName: user.name,
            senderImage: user.image,
          })
          .from(conversationParticipant)
          .innerJoin(user, eq(conversationParticipant.userId, user.id))
          .where(
            and(
              inArray(conversationParticipant.conversationId, conversationIds),
              isNull(conversationParticipant.leftAt)
            )
          ),

        db
          .select({
            conversationId: request.conversationId,
            id: request.id,
            requesterId: request.requesterId,
            requesterEmail: request.requesterEmail,
            requesterNameStored: request.requesterName,
            receiverOrganizationId: request.receiverOrganizationId,
            organizationName: organization.name,
            organizationLogo: organization.logo,
            requesterName: user.name,
            requesterImage: user.image,
            currentUserId: user.id,
          })
          .from(request)
          .leftJoin(organization, eq(organization.id, request.receiverOrganizationId))
          .leftJoin(user, eq(user.id, request.requesterId))
          .where(inArray(request.conversationId, conversationIds)),

        teamChatOrgIds.length > 0
          ? db
              .select({
                id: organization.id,
                name: organization.name,
                logo: organization.logo,
              })
              .from(organization)
              .where(inArray(organization.id, teamChatOrgIds))
          : Promise.resolve([]),
      ])

    // fetchLastMessagesGrouped already keys by conversationId AND never
    // returns null entries (it does its own SQL grouping), so a plain map
    // suffices. The defensive filter(null) that lives in PR #22's version
    // was for the older per-conversation Promise.all path which could
    // return null per iteration; that path is gone in this branch.
    const lastMessageMap = new Map(lastMessages.map((msg) => [msg.conversationId, msg]))
    const messageCountMap = new Map(messageCounts.map((mc) => [mc.conversationId, mc.count]))

    const participantsMap = new Map<
      string,
      Array<{ id: string; name: string; image?: string | null }>
    >()
    participants.forEach((p) => {
      const existing = participantsMap.get(p.conversationId) || []
      existing.push({
        id: p.senderId,
        name: p.senderName,
        image: p.senderImage,
      })
      participantsMap.set(p.conversationId, existing)
    })

    const requestMap = new Map(associatedRequests.map((req) => [req.conversationId, req]))
    const teamChatOrgMap = new Map(teamChatOrgs.map((org) => [org.id, org]))

    let conversations = userConversations.map((conv) => {
      const lastMessage = lastMessageMap.get(conv.id) || null
      const messageCount = messageCountMap.get(conv.id) || 0
      const conversationParticipants = participantsMap.get(conv.id) || []
      const associatedRequest = requestMap.get(conv.id)
      const conversationType = getConversationType(conv)

      let contextInfo: {
        type: 'user' | 'organization'
        id: string | null
        name: string
        image?: string | null
        logo?: string | null
        email?: string | null
      } | null = null
      let dynamicName = conv.name

      if (conversationType === 'team' && conv.organizationId) {
        const teamOrg = teamChatOrgMap.get(conv.organizationId)
        if (teamOrg) {
          contextInfo = {
            type: 'organization',
            id: teamOrg.id,
            name: teamOrg.name,
            logo: teamOrg.logo,
          }
        }
      } else if (associatedRequest) {
        const currentRequestUserId =
          associatedRequest.currentUserId || associatedRequest.requesterId

        if (
          currentRequestUserId === userId &&
          associatedRequest.receiverOrganizationId &&
          associatedRequest.organizationName
        ) {
          contextInfo = {
            type: 'organization',
            id: associatedRequest.receiverOrganizationId,
            name: associatedRequest.organizationName,
            logo: associatedRequest.organizationLogo,
          }
          dynamicName = associatedRequest.organizationName
        } else if (currentRequestUserId !== userId) {
          const displayName =
            associatedRequest.requesterName || associatedRequest.requesterNameStored
          if (displayName) {
            contextInfo = {
              type: 'user',
              id: associatedRequest.currentUserId,
              name: displayName,
              image: associatedRequest.requesterImage,
              email: associatedRequest.requesterEmail,
            }
            dynamicName = displayName
          }
        }
      } else if (conversationType === 'member_dm') {
        const otherParticipant = conversationParticipants.find(
          (participant) => participant.id !== userId
        )
        if (otherParticipant) {
          contextInfo = {
            type: 'user',
            id: otherParticipant.id,
            name: otherParticipant.name,
            image: otherParticipant.image,
          }
          dynamicName = otherParticipant.name
        }
      }

      return {
        ...conv,
        conversationType,
        name: dynamicName || conv.name || 'Untitled Conversation',
        lastMessage,
        messageCount,
        participants: conversationParticipants,
        contextInfo,
      }
    })

    conversations = conversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      const aTime = new Date(a.updatedAt).getTime()
      const bTime = new Date(b.updatedAt).getTime()
      return sort === 'newest' ? bTime - aTime : aTime - bTime
    })

    if (searchQuery) {
      const conversationIdsWithRequests = new Set(
        associatedRequests.map((req) => req.conversationId)
      )
      const searchLower = searchQuery.toLowerCase()

      conversations = conversations.filter((conv) => {
        const nameMatches = conv.name.toLowerCase().includes(searchLower)
        const messageMatches =
          conv.lastMessage?.content?.toLowerCase().includes(searchLower) ?? false

        let emailMatches = false
        if (conversationIdsWithRequests.has(conv.id)) {
          const associatedRequest = requestMap.get(conv.id)
          if (associatedRequest?.requesterEmail) {
            emailMatches = associatedRequest.requesterEmail.toLowerCase().includes(searchLower)
          }
        }

        return nameMatches || messageMatches || emailMatches
      })

      total = conversations.length
      conversations = conversations.slice(offset, offset + limit)
    } else {
      conversations = conversations.slice(offset, offset + limit)
    }

    // The shape lines up with ConversationWithDetails at runtime — the
    // `name` field gets coerced to a non-null string above via the
    // `dynamicName || conv.name || 'Untitled Conversation'` chain — but TS
    // can't follow that. Pre-fix this method declared its local
    // `userConversations` as `any[]` to avoid the cast; the row type is now
    // explicit (UserConversationRow) and the cast is scoped to the boundary.
    return { conversations: conversations as unknown as ConversationWithDetails[], total }
  }

  private async findMemberDmConversation(
    organizationId: string,
    currentUserId: string,
    targetUserId: string
  ): Promise<string | null> {
    const participantRows = await db
      .select({
        conversationId: conversationParticipant.conversationId,
        userId: conversationParticipant.userId,
      })
      .from(conversationParticipant)
      .innerJoin(conversation, eq(conversationParticipant.conversationId, conversation.id))
      .where(
        and(
          eq(conversation.organizationId, organizationId),
          eq(conversation.isTeamChat, false),
          isNull(conversation.requesterId),
          isNull(conversation.anonymousRequesterId),
          isNull(conversationParticipant.leftAt),
          inArray(conversationParticipant.userId, [currentUserId, targetUserId])
        )
      )

    const participantIdsByConversation = new Map<string, Set<string>>()
    for (const row of participantRows) {
      const participantIds = participantIdsByConversation.get(row.conversationId) ?? new Set()
      participantIds.add(row.userId)
      participantIdsByConversation.set(row.conversationId, participantIds)
    }

    const candidateIds = [...participantIdsByConversation.entries()]
      .filter(([, participantIds]) => {
        return participantIds.has(currentUserId) && participantIds.has(targetUserId)
      })
      .map(([conversationId]) => conversationId)

    if (candidateIds.length === 0) return null

    const participantCounts = await db
      .select({
        conversationId: conversationParticipant.conversationId,
        count: count(conversationParticipant.id),
      })
      .from(conversationParticipant)
      .where(
        and(
          inArray(conversationParticipant.conversationId, candidateIds),
          isNull(conversationParticipant.leftAt)
        )
      )
      .groupBy(conversationParticipant.conversationId)

    const exactMatch = participantCounts.find((row) => row.count === 2)
    return exactMatch?.conversationId ?? null
  }

  async resolveMemberDmConversation({
    organizationId,
    currentUserId,
    targetUserId,
  }: {
    organizationId: string
    currentUserId: string
    targetUserId: string
  }): Promise<{ conversationId: string; conversationType: 'member_dm' }> {
    const memberships = await db
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          inArray(member.userId, [currentUserId, targetUserId])
        )
      )

    const memberIds = new Set(memberships.map((membership) => membership.userId))
    if (!memberIds.has(currentUserId) || !memberIds.has(targetUserId)) {
      throw new ConversationMemberDmForbiddenError()
    }

    const existingConversationId = await this.findMemberDmConversation(
      organizationId,
      currentUserId,
      targetUserId
    )

    if (existingConversationId) {
      return { conversationId: existingConversationId, conversationType: 'member_dm' }
    }

    const targetUsers = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1)

    const targetName = targetUsers[0]?.name ?? 'member'
    const newConversation = await db
      .insert(conversation)
      .values({
        name: `Direct message with ${targetName}`,
        description: 'Private member direct message',
        createdBy: currentUserId,
        organizationId,
        requesterId: null,
        anonymousRequesterId: null,
        isTeamChat: false,
      })
      .returning({ id: conversation.id })

    const conversationId = newConversation[0].id

    await db.insert(conversationParticipant).values([
      {
        conversationId,
        userId: currentUserId,
        role: 'member',
      },
      {
        conversationId,
        userId: targetUserId,
        role: 'member',
      },
    ])

    return { conversationId, conversationType: 'member_dm' }
  }

  /**
   * Last message of each conversation, plus its `isUnread` for the given
   * user — in two queries total instead of two per conversation.
   *
   * Strategy:
   *   1. One correlated subquery returns the latest row per conversation_id
   *      (the (conversation_id, created_at) index makes this cheap).
   *   2. One batched IN-list lookup against messageRead resolves the read
   *      state for all returned messages at once.
   *
   * Pre-fix this was a Promise.all over conversationIds where each iteration
   * issued 2 queries; with 100 conversations that meant 200 round-trips on
   * every chat list load.
   */
  private async fetchLastMessagesGrouped(conversationIds: string[], userId: string) {
    if (conversationIds.length === 0) return []

    const latest = await db
      .select({
        conversationId: message.conversationId,
        id: message.id,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        replyToId: message.replyToId,
        metadata: message.metadata,
        senderName: user.name,
        senderImage: user.image,
      })
      .from(message)
      .leftJoin(user, eq(message.senderId, user.id))
      .where(
        and(
          inArray(message.conversationId, conversationIds),
          sql`${message.createdAt} = (SELECT MAX(m2.created_at) FROM message m2 WHERE m2.conversation_id = ${message.conversationId})`
        )
      )

    if (latest.length === 0) return []

    const messageIds = latest.map((m) => m.id)
    const reads = await db
      .select({ messageId: messageRead.messageId })
      .from(messageRead)
      .where(and(eq(messageRead.userId, userId), inArray(messageRead.messageId, messageIds)))
    const readSet = new Set(reads.map((r) => r.messageId))

    return latest.map((msg) => ({
      ...msg,
      content: msg.isDeleted ? 'This message was deleted' : decryptContent(msg.content),
      metadata: msg.metadata as Record<string, unknown> | null,
      isUnread: msg.senderId !== userId && !readSet.has(msg.id),
    }))
  }

  private async getUnreadConversationIds(
    conversationIds: string[],
    userId: string
  ): Promise<string[]> {
    // Reuse the grouped helper instead of a sequential per-conversation loop.
    // Pre-fix this method was 2 queries × N conversations, run sequentially —
    // ~20s on 100 conversations.
    const lastMessages = await this.fetchLastMessagesGrouped(conversationIds, userId)
    return lastMessages.filter((m) => m.isUnread).map((m) => m.conversationId)
  }

  async createTeamConversation(organizationId: string, creatorId: string): Promise<string> {
    const orgInfo = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    if (!orgInfo.length) {
      throw new Error('Organization not found')
    }

    const existingTeamChat = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(eq(conversation.organizationId, organizationId), eq(conversation.isTeamChat, true))
      )
      .limit(1)

    if (existingTeamChat.length > 0) {
      return existingTeamChat[0].id
    }

    const newConversation = await db
      .insert(conversation)
      .values({
        name: `${orgInfo[0].name}`,
        description: 'Team chat for all organization members',
        createdBy: creatorId,
        organizationId,
        isTeamChat: true,
        requesterId: null,
        anonymousRequesterId: null,
      })
      .returning()

    const conversationId = newConversation[0].id

    const orgMembers = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, organizationId))

    const participantsToInsert = orgMembers.map((m) => ({
      conversationId,
      userId: m.userId,
      role: m.userId === creatorId ? 'owner' : 'member',
    }))

    if (!participantsToInsert.some((p) => p.userId === creatorId)) {
      participantsToInsert.push({
        conversationId,
        userId: creatorId,
        role: 'owner',
      })
    }

    await db.insert(conversationParticipant).values(participantsToInsert)

    return conversationId
  }

  async addMemberToTeamChat(organizationId: string, userId: string): Promise<void> {
    const teamConv = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(eq(conversation.organizationId, organizationId), eq(conversation.isTeamChat, true))
      )
      .limit(1)

    if (!teamConv.length) {
      throw new Error('Team conversation not found')
    }

    const existing = await db
      .select({ id: conversationParticipant.id })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, teamConv[0].id),
          eq(conversationParticipant.userId, userId)
        )
      )
      .limit(1)

    if (!existing.length) {
      await db.insert(conversationParticipant).values({
        conversationId: teamConv[0].id,
        userId,
        role: 'member',
      })
    }
  }

  async addMemberToAllOrganizationConversations(
    organizationId: string,
    userId: string
  ): Promise<void> {
    const orgConversations = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(eq(conversation.organizationId, organizationId))

    if (!orgConversations.length) {
      return
    }

    const conversationIds = orgConversations.map((c) => c.id)

    const existingParticipations = await db
      .select({ conversationId: conversationParticipant.conversationId })
      .from(conversationParticipant)
      .where(
        and(
          inArray(conversationParticipant.conversationId, conversationIds),
          eq(conversationParticipant.userId, userId)
        )
      )

    const existingConversationIds = new Set(existingParticipations.map((p) => p.conversationId))

    const newParticipations = conversationIds
      .filter((id) => !existingConversationIds.has(id))
      .map((conversationId) => ({
        conversationId,
        userId,
        role: 'member' as const,
      }))

    if (newParticipations.length > 0) {
      await db.insert(conversationParticipant).values(newParticipations)
    }
  }

  async pinConversation(conversationId: string, userId: string): Promise<void> {
    const participant = await db
      .select({ id: conversationParticipant.id })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, userId)
        )
      )
      .limit(1)

    if (!participant.length) {
      throw new Error('User is not a participant in this conversation')
    }

    await db
      .update(conversationParticipant)
      .set({
        isPinned: true,
        pinnedAt: new Date(),
      })
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, userId)
        )
      )
  }

  async unpinConversation(conversationId: string, userId: string): Promise<void> {
    const participant = await db
      .select({ id: conversationParticipant.id })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, userId)
        )
      )
      .limit(1)

    if (!participant.length) {
      throw new Error('User is not a participant in this conversation')
    }

    await db
      .update(conversationParticipant)
      .set({
        isPinned: false,
        pinnedAt: null,
      })
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, userId)
        )
      )
  }

  async getUnreadConversationsCount(
    userId: string
  ): Promise<{ count: number; conversationIds: string[] }> {
    const userConversations = await db
      .select({
        id: conversation.id,
      })
      .from(conversationParticipant)
      .innerJoin(conversation, eq(conversationParticipant.conversationId, conversation.id))
      .where(eq(conversationParticipant.userId, userId))

    if (userConversations.length === 0) {
      return { count: 0, conversationIds: [] }
    }

    const conversationIds = userConversations.map((conv) => conv.id)
    const unreadConversationIds = await this.getUnreadConversationIds(conversationIds, userId)

    return { count: unreadConversationIds.length, conversationIds: unreadConversationIds }
  }
}

export const conversationRepository = new DrizzleConversationRepository()
