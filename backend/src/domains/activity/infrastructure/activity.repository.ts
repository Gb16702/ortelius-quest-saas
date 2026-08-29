import { and, desc, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import { activityEvent } from '../../../infrastructure/database/db/schemas/activity-schema'
import { member, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import type {
  ActivityEvent,
  ActivityFilters,
  ActivityPage,
  ActivityScoreBreakdownItem,
  ActivityScoreFilters,
  CreateActivityData,
  EventTypeInfo,
} from '../application/activity-models'
import type { ActivityRepositoryPort } from '../application/ports'
import {
  decodeActivityCursor,
  EVENT_TYPE_METADATA,
  encodeActivityCursor,
  getActivityScoreEventWeight,
} from '../domain'

export class DrizzleActivityRepository implements ActivityRepositoryPort {
  async create(data: CreateActivityData): Promise<ActivityEvent> {
    const id = nanoid()
    const now = new Date()

    const [row] = await db
      .insert(activityEvent)
      .values({
        id,
        organizationId: data.organizationId,
        actorId: data.actorId,
        eventType: data.eventType,
        description: data.description,
        metadata: data.metadata ?? null,
        createdAt: now,
      })
      .returning()

    return {
      id: row.id,
      organizationId: row.organizationId,
      actorId: row.actorId,
      eventType: row.eventType,
      description: row.description,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
    }
  }

  async getByOrganization(
    organizationId: string,
    filters: ActivityFilters = {}
  ): Promise<ActivityPage> {
    const limit = filters.limit ?? 25
    const conditions = [eq(activityEvent.organizationId, organizationId)]

    if (filters.actorId) {
      conditions.push(eq(activityEvent.actorId, filters.actorId))
    }

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      conditions.push(inArray(activityEvent.eventType, filters.eventTypes))
    }

    if (filters.fromDate) {
      conditions.push(gte(activityEvent.createdAt, filters.fromDate))
    }

    if (filters.toDate) {
      conditions.push(lte(activityEvent.createdAt, filters.toDate))
    }

    if (filters.cursor) {
      const cursorData = decodeActivityCursor(filters.cursor)
      if (cursorData) {
        conditions.push(
          or(
            lt(activityEvent.createdAt, cursorData.createdAt),
            and(
              eq(activityEvent.createdAt, cursorData.createdAt),
              lt(activityEvent.id, cursorData.id)
            )
          )!
        )
      }
    }

    const rows = await db
      .select({
        id: activityEvent.id,
        organizationId: activityEvent.organizationId,
        actorId: activityEvent.actorId,
        eventType: activityEvent.eventType,
        description: activityEvent.description,
        metadata: activityEvent.metadata,
        createdAt: activityEvent.createdAt,
        actorName: user.name,
        actorImage: user.image,
      })
      .from(activityEvent)
      .leftJoin(user, eq(activityEvent.actorId, user.id))
      .where(and(...conditions))
      .orderBy(desc(activityEvent.createdAt), desc(activityEvent.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows

    const mentionedUserIds = new Set<string>()
    for (const row of items) {
      const meta = row.metadata as Record<string, unknown> | null
      if (meta && typeof meta.userId === 'string') {
        mentionedUserIds.add(meta.userId)
      }
    }

    let currentMemberIds = new Set<string>()
    if (mentionedUserIds.size > 0) {
      const currentMembers = await db
        .select({ userId: member.userId })
        .from(member)
        .where(
          and(
            eq(member.organizationId, organizationId),
            inArray(member.userId, Array.from(mentionedUserIds))
          )
        )
      currentMemberIds = new Set(currentMembers.map((m) => m.userId))
    }

    const events: ActivityEvent[] = items.map((row) => {
      const metadata = row.metadata as Record<string, unknown> | null
      const mentionedUserId =
        metadata && typeof metadata.userId === 'string' ? metadata.userId : null
      const mentionedUserIsFormerMember =
        mentionedUserId !== null && !currentMemberIds.has(mentionedUserId)

      return {
        id: row.id,
        organizationId: row.organizationId,
        actorId: row.actorId,
        eventType: row.eventType,
        description: row.description,
        metadata,
        createdAt: row.createdAt,
        actor: row.actorId
          ? { id: row.actorId, name: row.actorName!, image: row.actorImage ?? null }
          : null,
        mentionedUserIsFormerMember,
      }
    })

    const lastItem = items[items.length - 1]
    const nextCursor =
      hasMore && lastItem ? encodeActivityCursor(lastItem.createdAt, lastItem.id) : null

    return { events, nextCursor }
  }

  async getEventTypes(): Promise<EventTypeInfo[]> {
    return Object.entries(EVENT_TYPE_METADATA).map(([type, meta]) => ({
      type,
      key: type,
      label: meta.label,
      description: meta.description,
    }))
  }

  async getScoreBreakdown(
    organizationId: string,
    filters: ActivityScoreFilters
  ): Promise<ActivityScoreBreakdownItem[]> {
    const rows = await db
      .select({
        eventType: activityEvent.eventType,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(activityEvent)
      .where(
        and(
          eq(activityEvent.organizationId, organizationId),
          eq(activityEvent.actorId, filters.actorId),
          gte(activityEvent.createdAt, filters.fromDate),
          lt(activityEvent.createdAt, filters.toDate)
        )
      )
      .groupBy(activityEvent.eventType)

    return rows
      .map((row) => {
        const count = Number(row.count)
        return {
          eventType: row.eventType,
          count,
          points: count * getActivityScoreEventWeight(row.eventType),
        }
      })
      .sort((a, b) => b.points - a.points)
  }
}
