import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { assistantConversation } from '../../../infrastructure/database/db/schemas/assistant-schema'
import { member, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
} from '../../../infrastructure/database/db/schemas/chat-schema'
import {
  favorite,
  favoriteGroup,
  favoritePlacement,
} from '../../../infrastructure/database/db/schemas/favorite-schema'
import { invoice } from '../../../infrastructure/database/db/schemas/invoice-schema'
import { quote } from '../../../infrastructure/database/db/schemas/quote-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'

export type FavoriteEntityType =
  | 'request'
  | 'quote'
  | 'invoice'
  | 'conversation'
  | 'member'
  | 'assistant_conversation'
type StoredFavoriteEntityType = Exclude<FavoriteEntityType, 'conversation'>

export interface FavoriteResponseItem {
  id: string
  entityType: FavoriteEntityType
  entityId: string
  organizationId: string | null
  groupId: string | null
  position: number
  label: string
  subtitle?: string
  createdAt: string
  meta?: Record<string, string | boolean | null>
}

export interface FavoriteGroupResponseItem {
  id: string
  organizationId: string
  name: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface FavoritesResponseData {
  favorites: FavoriteResponseItem[]
  groups: FavoriteGroupResponseItem[]
}

interface StoredFavoriteRow {
  id: string
  entityType: FavoriteEntityType
  entityId: string
  organizationId: string | null
  createdAt: Date
}

interface FavoritePlacementRow {
  entityType: FavoriteEntityType
  entityId: string
  groupId: string | null
  position: number
}

export interface CreateFavoriteGroupInput {
  userId: string
  organizationId: string
  name: string
}

export interface UpdateFavoriteGroupInput {
  userId: string
  organizationId: string
  groupId: string
  name: string
}

export interface DeleteFavoriteGroupInput {
  userId: string
  organizationId: string
  groupId: string
}

export interface FavoritePlacementInput {
  entityType: FavoriteEntityType
  entityId: string
  groupId: string | null
  position: number
}

export interface ReorderFavoritesInput {
  userId: string
  organizationId: string
  items: FavoritePlacementInput[]
  groups?: Array<{ id: string; position: number }>
}

interface FavoriteRequestTarget {
  id: string
  reqNumber: string
  requesterName: string
  organizationId: string
  requesterId: string
}

interface FavoriteQuoteTarget {
  id: string
  quoteNumber: string
  organizationId: string
  requestNumber: string
  requesterId: string
}

interface FavoriteInvoiceTarget {
  id: string
  invoiceNumber: string
  organizationId: string
  requestNumber: string
  requesterId: string
}

interface FavoriteMemberTarget {
  id: string
  name: string
  image: string | null
  organizationId: string
}

interface FavoriteAssistantConversationTarget {
  id: string
  userId: string
  organizationId: string | null
  title: string
}

function favoriteMemberKey(userId: string, organizationId: string | null): string {
  return `${userId}:${organizationId ?? ''}`
}

async function isOrganizationMember(userId: string, organizationId: string): Promise<boolean> {
  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1)

  return Boolean(membership)
}

export async function resolveFavoriteTarget(
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string,
  expectedOrganizationId?: string
): Promise<Omit<FavoriteResponseItem, 'id' | 'createdAt'> | null> {
  if (entityType === 'conversation') {
    const [row] = await db
      .select({
        id: conversation.id,
        name: conversation.name,
        organizationId: conversation.organizationId,
        isTeamChat: conversation.isTeamChat,
      })
      .from(conversationParticipant)
      .innerJoin(conversation, eq(conversation.id, conversationParticipant.conversationId))
      .where(
        and(
          eq(conversationParticipant.userId, userId),
          eq(conversationParticipant.conversationId, entityId)
        )
      )
      .limit(1)

    if (!row) return null
    if (expectedOrganizationId && row.organizationId !== expectedOrganizationId) return null

    return {
      entityType,
      entityId: row.id,
      organizationId: row.organizationId,
      groupId: null,
      position: 0,
      label: row.isTeamChat ? 'Team chat' : row.name || 'Conversation',
      subtitle: 'Conversation',
      meta: { isTeamChat: row.isTeamChat },
    }
  }

  if (entityType === 'assistant_conversation') {
    const [row] = await db
      .select({
        id: assistantConversation.id,
        userId: assistantConversation.userId,
        organizationId: assistantConversation.organizationId,
        title: assistantConversation.title,
      })
      .from(assistantConversation)
      .where(
        and(
          eq(assistantConversation.id, entityId),
          eq(assistantConversation.userId, userId),
          isNull(assistantConversation.deletedAt)
        )
      )
      .limit(1)

    if (!row) return null
    if (expectedOrganizationId && row.organizationId !== expectedOrganizationId) return null

    return {
      entityType,
      entityId: row.id,
      organizationId: row.organizationId,
      groupId: null,
      position: 0,
      label: row.title,
      subtitle: 'AI chat',
      meta: { assistantChat: true, title: row.title },
    }
  }

  if (entityType === 'request') {
    const [row] = await db
      .select({
        id: request.id,
        reqNumber: request.reqNumber,
        requesterName: request.requesterName,
        organizationId: request.receiverOrganizationId,
        requesterId: request.requesterId,
      })
      .from(request)
      .where(eq(request.id, entityId))
      .limit(1)

    if (!row) return null
    if (expectedOrganizationId && row.organizationId !== expectedOrganizationId) return null
    if (row.requesterId !== userId && !(await isOrganizationMember(userId, row.organizationId))) {
      return null
    }

    return {
      entityType,
      entityId: row.id,
      organizationId: row.organizationId,
      groupId: null,
      position: 0,
      label: row.reqNumber,
      subtitle: row.requesterName,
      meta: { requestNumber: row.reqNumber },
    }
  }

  if (entityType === 'quote') {
    const [row] = await db
      .select({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        organizationId: quote.organizationId,
        requestNumber: request.reqNumber,
        requesterId: request.requesterId,
      })
      .from(quote)
      .innerJoin(request, eq(request.id, quote.requestId))
      .where(eq(quote.id, entityId))
      .limit(1)

    if (!row) return null
    if (expectedOrganizationId && row.organizationId !== expectedOrganizationId) return null
    if (row.requesterId !== userId && !(await isOrganizationMember(userId, row.organizationId))) {
      return null
    }

    return {
      entityType,
      entityId: row.id,
      organizationId: row.organizationId,
      groupId: null,
      position: 0,
      label: row.quoteNumber,
      subtitle: row.requestNumber,
      meta: { requestNumber: row.requestNumber, quoteNumber: row.quoteNumber },
    }
  }

  if (entityType === 'member') {
    const membershipCondition = expectedOrganizationId
      ? and(eq(member.userId, entityId), eq(member.organizationId, expectedOrganizationId))
      : eq(member.userId, entityId)
    const [row] = await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        organizationId: member.organizationId,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(membershipCondition)
      .limit(1)

    if (!row) return null
    if (!(await isOrganizationMember(userId, row.organizationId))) return null

    return {
      entityType,
      entityId: row.id,
      organizationId: row.organizationId,
      groupId: null,
      position: 0,
      label: row.name,
      subtitle: 'Member profile',
      meta: { name: row.name, image: row.image ?? null },
    }
  }

  const [row] = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      organizationId: invoice.organizationId,
      requestNumber: request.reqNumber,
      requesterId: request.requesterId,
    })
    .from(invoice)
    .innerJoin(request, eq(request.id, invoice.requestId))
    .where(eq(invoice.id, entityId))
    .limit(1)

  if (!row) return null
  if (expectedOrganizationId && row.organizationId !== expectedOrganizationId) return null
  if (row.requesterId !== userId && !(await isOrganizationMember(userId, row.organizationId))) {
    return null
  }

  return {
    entityType,
    entityId: row.id,
    organizationId: row.organizationId,
    groupId: null,
    position: 0,
    label: row.invoiceNumber,
    subtitle: row.requestNumber,
    meta: { requestNumber: row.requestNumber, invoiceNumber: row.invoiceNumber },
  }
}

async function listFavoriteRows(
  userId: string,
  organizationId?: string
): Promise<FavoriteResponseItem[]> {
  const rows = await db
    .select({
      id: favorite.id,
      entityType: favorite.entityType,
      entityId: favorite.entityId,
      organizationId: favorite.organizationId,
      createdAt: favorite.createdAt,
    })
    .from(favorite)
    .where(
      organizationId
        ? and(eq(favorite.userId, userId), eq(favorite.organizationId, organizationId))
        : eq(favorite.userId, userId)
    )
    .orderBy(desc(favorite.createdAt))

  return resolveStoredFavoriteRows(userId, rows)
}

export async function findStoredFavorite(
  userId: string,
  entityType: StoredFavoriteEntityType,
  entityId: string
): Promise<FavoriteResponseItem | null> {
  const [row] = await db
    .select({
      id: favorite.id,
      entityType: favorite.entityType,
      entityId: favorite.entityId,
      organizationId: favorite.organizationId,
      createdAt: favorite.createdAt,
    })
    .from(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        eq(favorite.entityType, entityType),
        eq(favorite.entityId, entityId)
      )
    )
    .limit(1)

  if (!row) return null

  const [item] = await resolveStoredFavoriteRows(userId, [row])
  return item ?? null
}

async function resolveStoredFavoriteRows(
  userId: string,
  rows: StoredFavoriteRow[]
): Promise<FavoriteResponseItem[]> {
  if (rows.length === 0) return []

  const requestIds = rows.filter((row) => row.entityType === 'request').map((row) => row.entityId)
  const quoteIds = rows.filter((row) => row.entityType === 'quote').map((row) => row.entityId)
  const invoiceIds = rows.filter((row) => row.entityType === 'invoice').map((row) => row.entityId)
  const memberRows = rows.filter((row) => row.entityType === 'member')
  const assistantConversationRows = rows.filter(
    (row) => row.entityType === 'assistant_conversation'
  )
  const organizationIds = [
    ...new Set(rows.map((row) => row.organizationId).filter((id): id is string => Boolean(id))),
  ]

  const [requests, quotes, invoices, members, assistantConversations, membershipSet] =
    await Promise.all([
      loadFavoriteRequests(requestIds),
      loadFavoriteQuotes(quoteIds),
      loadFavoriteInvoices(invoiceIds),
      loadFavoriteMembers(memberRows),
      loadFavoriteAssistantConversations(userId, assistantConversationRows),
      loadOrganizationMembershipSet(userId, organizationIds),
    ])

  const resolved: FavoriteResponseItem[] = []

  for (const row of rows) {
    const createdAt = row.createdAt.toISOString()

    if (row.entityType === 'request') {
      const target = requests.get(row.entityId)
      if (
        target &&
        target.organizationId === row.organizationId &&
        (target.requesterId === userId || membershipSet.has(target.organizationId))
      ) {
        resolved.push({
          id: row.id,
          entityType: row.entityType,
          entityId: target.id,
          organizationId: target.organizationId,
          groupId: null,
          position: 0,
          label: target.reqNumber,
          subtitle: target.requesterName,
          createdAt,
          meta: { requestNumber: target.reqNumber },
        })
      }
      continue
    }

    if (row.entityType === 'quote') {
      const target = quotes.get(row.entityId)
      if (
        target &&
        target.organizationId === row.organizationId &&
        (target.requesterId === userId || membershipSet.has(target.organizationId))
      ) {
        resolved.push({
          id: row.id,
          entityType: row.entityType,
          entityId: target.id,
          organizationId: target.organizationId,
          groupId: null,
          position: 0,
          label: target.quoteNumber,
          subtitle: target.requestNumber,
          createdAt,
          meta: { requestNumber: target.requestNumber, quoteNumber: target.quoteNumber },
        })
      }
      continue
    }

    if (row.entityType === 'invoice') {
      const target = invoices.get(row.entityId)
      if (
        target &&
        target.organizationId === row.organizationId &&
        (target.requesterId === userId || membershipSet.has(target.organizationId))
      ) {
        resolved.push({
          id: row.id,
          entityType: row.entityType,
          entityId: target.id,
          organizationId: target.organizationId,
          groupId: null,
          position: 0,
          label: target.invoiceNumber,
          subtitle: target.requestNumber,
          createdAt,
          meta: { requestNumber: target.requestNumber, invoiceNumber: target.invoiceNumber },
        })
      }
      continue
    }

    if (row.entityType === 'member') {
      const target = members.get(favoriteMemberKey(row.entityId, row.organizationId))
      if (target && membershipSet.has(target.organizationId)) {
        resolved.push({
          id: row.id,
          entityType: row.entityType,
          entityId: target.id,
          organizationId: target.organizationId,
          groupId: null,
          position: 0,
          label: target.name,
          subtitle: 'Member profile',
          createdAt,
          meta: { name: target.name, image: target.image },
        })
      }
      continue
    }

    if (row.entityType === 'assistant_conversation') {
      const target = assistantConversations.get(row.entityId)
      if (
        target &&
        target.userId === userId &&
        target.organizationId === row.organizationId &&
        (!target.organizationId || membershipSet.has(target.organizationId))
      ) {
        resolved.push({
          id: row.id,
          entityType: row.entityType,
          entityId: target.id,
          organizationId: target.organizationId,
          groupId: null,
          position: 0,
          label: target.title,
          subtitle: 'AI chat',
          createdAt,
          meta: { assistantChat: true, title: target.title },
        })
      }
    }
  }

  return resolved
}

async function loadOrganizationMembershipSet(userId: string, organizationIds: string[]) {
  if (organizationIds.length === 0) return new Set<string>()

  const rows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(and(eq(member.userId, userId), inArray(member.organizationId, organizationIds)))

  return new Set(rows.map((row) => row.organizationId))
}

async function loadFavoriteRequests(ids: string[]) {
  if (ids.length === 0) return new Map<string, FavoriteRequestTarget>()

  const rows = await db
    .select({
      id: request.id,
      reqNumber: request.reqNumber,
      requesterName: request.requesterName,
      organizationId: request.receiverOrganizationId,
      requesterId: request.requesterId,
    })
    .from(request)
    .where(inArray(request.id, ids))

  return new Map(rows.map((row) => [row.id, row]))
}

async function loadFavoriteQuotes(ids: string[]) {
  if (ids.length === 0) return new Map<string, FavoriteQuoteTarget>()

  const rows = await db
    .select({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      organizationId: quote.organizationId,
      requestNumber: request.reqNumber,
      requesterId: request.requesterId,
    })
    .from(quote)
    .innerJoin(request, eq(request.id, quote.requestId))
    .where(inArray(quote.id, ids))

  return new Map(rows.map((row) => [row.id, row]))
}

async function loadFavoriteInvoices(ids: string[]) {
  if (ids.length === 0) return new Map<string, FavoriteInvoiceTarget>()

  const rows = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      organizationId: invoice.organizationId,
      requestNumber: request.reqNumber,
      requesterId: request.requesterId,
    })
    .from(invoice)
    .innerJoin(request, eq(request.id, invoice.requestId))
    .where(inArray(invoice.id, ids))

  return new Map(rows.map((row) => [row.id, row]))
}

async function loadFavoriteMembers(rows: StoredFavoriteRow[]) {
  if (rows.length === 0) return new Map<string, FavoriteMemberTarget>()

  const ids = [...new Set(rows.map((row) => row.entityId))]
  const organizationIds = [
    ...new Set(rows.map((row) => row.organizationId).filter((id): id is string => Boolean(id))),
  ]
  if (organizationIds.length === 0) return new Map<string, FavoriteMemberTarget>()

  const targets = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      organizationId: member.organizationId,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(inArray(member.userId, ids), inArray(member.organizationId, organizationIds)))

  return new Map(
    targets.map((target) => [favoriteMemberKey(target.id, target.organizationId), target])
  )
}

async function loadFavoriteAssistantConversations(userId: string, rows: StoredFavoriteRow[]) {
  if (rows.length === 0) return new Map<string, FavoriteAssistantConversationTarget>()

  const ids = [...new Set(rows.map((row) => row.entityId))]
  const targets = await db
    .select({
      id: assistantConversation.id,
      userId: assistantConversation.userId,
      organizationId: assistantConversation.organizationId,
      title: assistantConversation.title,
    })
    .from(assistantConversation)
    .where(
      and(
        eq(assistantConversation.userId, userId),
        inArray(assistantConversation.id, ids),
        isNull(assistantConversation.deletedAt)
      )
    )

  return new Map(targets.map((target) => [target.id, target]))
}

async function listPinnedConversationFavorites(
  userId: string,
  organizationId?: string
): Promise<FavoriteResponseItem[]> {
  const rows = await db
    .select({
      id: conversation.id,
      name: conversation.name,
      organizationId: conversation.organizationId,
      isTeamChat: conversation.isTeamChat,
      pinnedAt: conversationParticipant.pinnedAt,
    })
    .from(conversationParticipant)
    .innerJoin(conversation, eq(conversation.id, conversationParticipant.conversationId))
    .where(
      organizationId
        ? and(
            eq(conversationParticipant.userId, userId),
            eq(conversationParticipant.isPinned, true),
            eq(conversation.organizationId, organizationId)
          )
        : and(
            eq(conversationParticipant.userId, userId),
            eq(conversationParticipant.isPinned, true)
          )
    )
    .orderBy(desc(conversationParticipant.pinnedAt))

  return rows.map((row) => ({
    id: `conversation:${row.id}`,
    entityType: 'conversation',
    entityId: row.id,
    organizationId: row.organizationId,
    groupId: null,
    position: 0,
    label: row.isTeamChat ? 'Team chat' : row.name || 'Conversation',
    subtitle: 'Conversation',
    createdAt: (row.pinnedAt ?? new Date()).toISOString(),
    meta: { isTeamChat: row.isTeamChat },
  }))
}

export async function listFavorites(
  userId: string,
  organizationId?: string
): Promise<FavoriteResponseItem[]> {
  const [objectFavorites, conversationFavorites] = await Promise.all([
    listFavoriteRows(userId, organizationId),
    listPinnedConversationFavorites(userId, organizationId),
  ])

  const sortedFavorites = [...objectFavorites, ...conversationFavorites].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )

  const placements = await listFavoritePlacements(userId, organizationId)
  return applyFavoritePlacements(sortedFavorites, placements)
}

export async function listFavoritesData(
  userId: string,
  organizationId?: string
): Promise<FavoritesResponseData> {
  const [favorites, groups] = await Promise.all([
    listFavorites(userId, organizationId),
    listFavoriteGroups(userId, organizationId),
  ])

  return { favorites, groups }
}

export async function listFavoriteGroups(
  userId: string,
  organizationId?: string
): Promise<FavoriteGroupResponseItem[]> {
  const rows = await db
    .select({
      id: favoriteGroup.id,
      organizationId: favoriteGroup.organizationId,
      name: favoriteGroup.name,
      position: favoriteGroup.position,
      createdAt: favoriteGroup.createdAt,
      updatedAt: favoriteGroup.updatedAt,
    })
    .from(favoriteGroup)
    .where(
      organizationId
        ? and(eq(favoriteGroup.userId, userId), eq(favoriteGroup.organizationId, organizationId))
        : eq(favoriteGroup.userId, userId)
    )
    .orderBy(asc(favoriteGroup.position), asc(favoriteGroup.createdAt))

  return rows.map(formatFavoriteGroup)
}

export async function createFavoriteGroup({
  userId,
  organizationId,
  name,
}: CreateFavoriteGroupInput): Promise<FavoriteGroupResponseItem | null> {
  if (!(await isOrganizationMember(userId, organizationId))) return null

  const [row] = await db
    .insert(favoriteGroup)
    .values({
      userId,
      organizationId,
      name,
      position: Math.floor(Date.now() / 1000),
    })
    .returning()

  return row ? formatFavoriteGroup(row) : null
}

export async function updateFavoriteGroup({
  userId,
  organizationId,
  groupId,
  name,
}: UpdateFavoriteGroupInput): Promise<FavoriteGroupResponseItem | null> {
  const [row] = await db
    .update(favoriteGroup)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(favoriteGroup.id, groupId),
        eq(favoriteGroup.userId, userId),
        eq(favoriteGroup.organizationId, organizationId)
      )
    )
    .returning()

  return row ? formatFavoriteGroup(row) : null
}

export async function deleteFavoriteGroup({
  userId,
  organizationId,
  groupId,
}: DeleteFavoriteGroupInput): Promise<boolean> {
  const row = await db.transaction(async (tx) => {
    const groupedFavorites = await tx
      .select({
        entityType: favoritePlacement.entityType,
        entityId: favoritePlacement.entityId,
      })
      .from(favoritePlacement)
      .where(
        and(
          eq(favoritePlacement.userId, userId),
          eq(favoritePlacement.organizationId, organizationId),
          eq(favoritePlacement.groupId, groupId)
        )
      )

    await tx
      .delete(favoritePlacement)
      .where(
        and(
          eq(favoritePlacement.userId, userId),
          eq(favoritePlacement.organizationId, organizationId),
          eq(favoritePlacement.groupId, groupId)
        )
      )

    for (const groupedFavorite of groupedFavorites) {
      await tx
        .delete(favorite)
        .where(
          and(
            eq(favorite.userId, userId),
            eq(favorite.organizationId, organizationId),
            eq(favorite.entityType, groupedFavorite.entityType),
            eq(favorite.entityId, groupedFavorite.entityId)
          )
        )
    }

    const [deletedGroup] = await tx
      .delete(favoriteGroup)
      .where(
        and(
          eq(favoriteGroup.id, groupId),
          eq(favoriteGroup.userId, userId),
          eq(favoriteGroup.organizationId, organizationId)
        )
      )
      .returning({ id: favoriteGroup.id })

    return deletedGroup
  })

  return Boolean(row)
}

export async function reorderFavorites({
  userId,
  organizationId,
  items,
  groups = [],
}: ReorderFavoritesInput): Promise<boolean> {
  if (!(await isOrganizationMember(userId, organizationId))) return false

  const currentFavorites = await listFavorites(userId, organizationId)
  const allowedFavoriteKeys = new Set(currentFavorites.map(favoriteIdentityKey))
  if (items.some((item) => !allowedFavoriteKeys.has(favoriteIdentityKey(item)))) return false

  const groupIds = [
    ...new Set([
      ...items.map((item) => item.groupId).filter((groupId): groupId is string => Boolean(groupId)),
      ...groups.map((group) => group.id),
    ]),
  ]

  if (groupIds.length > 0) {
    const existingGroups = await db
      .select({ id: favoriteGroup.id })
      .from(favoriteGroup)
      .where(
        and(
          eq(favoriteGroup.userId, userId),
          eq(favoriteGroup.organizationId, organizationId),
          inArray(favoriteGroup.id, groupIds)
        )
      )

    if (existingGroups.length !== groupIds.length) return false
  }

  const now = new Date()
  await db.transaction(async (tx) => {
    for (const group of groups) {
      await tx
        .update(favoriteGroup)
        .set({ position: group.position, updatedAt: now })
        .where(
          and(
            eq(favoriteGroup.id, group.id),
            eq(favoriteGroup.userId, userId),
            eq(favoriteGroup.organizationId, organizationId)
          )
        )
    }

    for (const item of items) {
      await tx
        .insert(favoritePlacement)
        .values({
          userId,
          organizationId,
          entityType: item.entityType,
          entityId: item.entityId,
          groupId: item.groupId,
          position: item.position,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            favoritePlacement.userId,
            favoritePlacement.organizationId,
            favoritePlacement.entityType,
            favoritePlacement.entityId,
          ],
          set: {
            groupId: item.groupId,
            position: item.position,
            updatedAt: now,
          },
        })
    }
  })

  return true
}

export async function removeFavoritePlacement(
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string
): Promise<void> {
  await db
    .delete(favoritePlacement)
    .where(
      and(
        eq(favoritePlacement.userId, userId),
        eq(favoritePlacement.entityType, entityType),
        eq(favoritePlacement.entityId, entityId)
      )
    )
}

function favoriteIdentityKey({
  entityType,
  entityId,
}: Pick<FavoritePlacementInput, 'entityType' | 'entityId'>): string {
  return `${entityType}:${entityId}`
}

function formatFavoriteGroup(row: {
  id: string
  organizationId: string
  name: string
  position: number
  createdAt: Date
  updatedAt: Date
}): FavoriteGroupResponseItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function listFavoritePlacements(
  userId: string,
  organizationId?: string
): Promise<Map<string, FavoritePlacementRow>> {
  const rows = await db
    .select({
      entityType: favoritePlacement.entityType,
      entityId: favoritePlacement.entityId,
      groupId: favoritePlacement.groupId,
      position: favoritePlacement.position,
    })
    .from(favoritePlacement)
    .where(
      organizationId
        ? and(
            eq(favoritePlacement.userId, userId),
            eq(favoritePlacement.organizationId, organizationId)
          )
        : eq(favoritePlacement.userId, userId)
    )

  return new Map(rows.map((row) => [favoriteIdentityKey(row), row]))
}

function applyFavoritePlacements(
  favorites: FavoriteResponseItem[],
  placements: Map<string, FavoritePlacementRow>
): FavoriteResponseItem[] {
  return favorites
    .map((favoriteItem, index) => {
      const placement = placements.get(favoriteIdentityKey(favoriteItem))
      return {
        ...favoriteItem,
        groupId: placement?.groupId ?? null,
        position: placement?.position ?? index * 1000,
      }
    })
    .sort((a, b) => a.position - b.position || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
