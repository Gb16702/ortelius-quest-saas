import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
  message,
  messageRead,
} from '../../../infrastructure/database/db/schemas/chat-schema'
import { decryptContent } from '../../../infrastructure/security/encryption.service'
import {
  type FavoritesResponseData,
  listFavoritesData,
} from '../../favorites/infrastructure/favorite-query.service'
import type {
  ConversationWithDetails,
  MessageWithSender,
} from '../../messaging/domain/messaging.types'
import { OrganizationPermissionError } from '../../organization/application/organization-errors'

const SIDEBAR_MEMBER_LIMIT = 100
const SIDEBAR_MEMBER_CONVERSATION_LIMIT = 50

type SidebarConversationRow = {
  id: string
  name: string | null
  description: string | null
  createdBy: string
  requesterId: string | null
  organizationId: string
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

interface SidebarBootstrapResult {
  members: SidebarMembersPage
  favorites: FavoritesResponseData
  conversations: {
    conversations: ConversationWithDetails[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }
}

interface SidebarMembersPage {
  members: SidebarMember[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  userRole: string
}

interface SidebarMember {
  id: string
  role: string
  createdAt: Date
  lastSeenAt: Date | null
  organizationId: string
  userId: string
  user: {
    id: string
    name: string
    image?: string | null
  }
}

interface ConversationParticipantSummary {
  id: string
  name: string
  image?: string | null
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function loadSidebarBootstrap(
  userId: string,
  organizationId: string
): Promise<SidebarBootstrapResult> {
  const membership = await findMembership(userId, organizationId)
  if (!membership) {
    throw new OrganizationPermissionError('User is not a member of this organization')
  }

  const [members, favorites, conversations] = await Promise.all([
    loadMembers(organizationId, membership.role),
    listFavoritesData(userId, organizationId),
    loadMemberDmConversations(userId, organizationId),
  ])

  return {
    members,
    favorites,
    conversations,
  }
}

async function findMembership(userId: string, organizationId: string) {
  const [row] = await db
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1)

  return row ?? null
}

async function loadMembers(organizationId: string, userRole: string): Promise<SidebarMembersPage> {
  const rows = await db
    .select({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      lastSeenAt: member.lastSeenAt,
      organizationId: member.organizationId,
      userId: member.userId,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
      total: sql<number>`cast(count(*) over() as integer)`,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(member.role))
    .limit(SIDEBAR_MEMBER_LIMIT)
    .offset(0)

  const total = Number(rows[0]?.total ?? 0)
  const totalPages = Math.ceil(total / SIDEBAR_MEMBER_LIMIT)

  return {
    members: rows.map(({ total: _total, ...row }) => row),
    total,
    page: 1,
    limit: SIDEBAR_MEMBER_LIMIT,
    userRole,
    totalPages,
    hasNextPage: totalPages > 1,
  }
}

async function loadMemberDmConversations(userId: string, organizationId: string) {
  const rows = await db
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
    .where(
      and(
        eq(conversationParticipant.userId, userId),
        eq(conversation.organizationId, organizationId),
        eq(conversation.isTeamChat, false),
        isNull(conversation.requesterId),
        isNull(conversation.anonymousRequesterId),
        isNull(conversationParticipant.leftAt)
      )
    )
    .orderBy(desc(conversationParticipant.isPinned), desc(conversation.updatedAt))
    .limit(SIDEBAR_MEMBER_CONVERSATION_LIMIT)
    .offset(0)

  if (rows.length === 0) {
    return {
      conversations: [],
      pagination: {
        total: 0,
        limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
        offset: 0,
        hasMore: false,
      },
    }
  }

  const conversationIds = rows.map((row) => row.id)
  const [participants, messageCounts, lastMessages] = await Promise.all([
    loadConversationParticipants(conversationIds),
    loadMessageCounts(conversationIds),
    loadLastMessages(conversationIds, userId),
  ])

  const conversations = rows.map((row) =>
    buildMemberDmConversation(row, userId, participants, messageCounts, lastMessages)
  )

  return {
    conversations,
    pagination: {
      total: conversations.length,
      limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
      offset: 0,
      hasMore: false,
    },
  }
}

async function loadConversationParticipants(conversationIds: string[]) {
  const rows = await db
    .select({
      conversationId: conversationParticipant.conversationId,
      userId: conversationParticipant.userId,
      name: user.name,
      image: user.image,
    })
    .from(conversationParticipant)
    .innerJoin(user, eq(conversationParticipant.userId, user.id))
    .where(
      and(
        inArray(conversationParticipant.conversationId, conversationIds),
        isNull(conversationParticipant.leftAt)
      )
    )

  const byConversation = new Map<string, ConversationParticipantSummary[]>()
  for (const row of rows) {
    const existing = byConversation.get(row.conversationId) ?? []
    existing.push({ id: row.userId, name: row.name, image: row.image })
    byConversation.set(row.conversationId, existing)
  }

  return byConversation
}

async function loadMessageCounts(conversationIds: string[]) {
  const rows = await db
    .select({
      conversationId: message.conversationId,
      count: count(message.id),
    })
    .from(message)
    .where(inArray(message.conversationId, conversationIds))
    .groupBy(message.conversationId)

  return new Map(rows.map((row) => [row.conversationId, Number(row.count)]))
}

async function loadLastMessages(conversationIds: string[], userId: string) {
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

  if (latest.length === 0) return new Map<string, MessageWithSender>()

  const messageIds = latest.map((row) => row.id)
  const reads = await db
    .select({ messageId: messageRead.messageId })
    .from(messageRead)
    .where(and(eq(messageRead.userId, userId), inArray(messageRead.messageId, messageIds)))
  const readSet = new Set(reads.map((row) => row.messageId))

  return new Map(
    latest.map((row) => [
      row.conversationId,
      {
        id: row.id,
        conversationId: row.conversationId,
        senderId: row.senderId,
        content: row.isDeleted ? 'This message was deleted' : decryptContent(row.content),
        messageType: row.messageType,
        replyToId: row.replyToId,
        metadata: toRecord(row.metadata),
        isEdited: row.isEdited,
        isDeleted: row.isDeleted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        senderName: row.senderName ?? 'Unknown user',
        senderImage: row.senderImage,
        isUnread: row.senderId !== userId && !readSet.has(row.id),
      },
    ])
  )
}

function buildMemberDmConversation(
  row: SidebarConversationRow,
  userId: string,
  participants: Map<string, ConversationParticipantSummary[]>,
  messageCounts: Map<string, number>,
  lastMessages: Map<string, MessageWithSender>
): ConversationWithDetails {
  const conversationParticipants = participants.get(row.id) ?? []
  const otherParticipant = conversationParticipants.find((participant) => participant.id !== userId)
  const name = otherParticipant?.name ?? row.name ?? 'Untitled Conversation'

  return {
    id: row.id,
    name,
    description: row.description,
    createdBy: row.createdBy,
    requesterId: row.requesterId,
    organizationId: row.organizationId,
    anonymousRequesterId: row.anonymousRequesterId,
    conversationType: 'member_dm',
    isTeamChat: row.isTeamChat,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    joinedAt: row.joinedAt,
    leftAt: row.leftAt,
    role: row.role,
    isPinned: row.isPinned,
    pinnedAt: row.pinnedAt,
    lastMessage: lastMessages.get(row.id) ?? null,
    messageCount: messageCounts.get(row.id) ?? 0,
    participants: conversationParticipants,
    contextInfo: otherParticipant
      ? {
          type: 'user',
          id: otherParticipant.id,
          name: otherParticipant.name,
          image: otherParticipant.image,
        }
      : null,
  }
}
