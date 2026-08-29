import { and, count, desc, eq, lt, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import { conversation, voipCall } from '../../../infrastructure/database/db/schemas/chat-schema'
import type {
  CallHistoryQuery,
  CallHistoryResult,
  CallRecord,
  CallStatus,
  CallType,
  InitiateCallInput,
} from '../domain/calls.types'

function toRecord(row: typeof voipCall.$inferSelect): CallRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    callerId: row.callerId,
    calleeId: row.calleeId,
    callType: row.callType as CallType,
    status: row.status as CallStatus,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    duration: row.duration,
    endedBy: row.endedBy,
    recordingUrl: row.recordingUrl,
    transcriptId: row.transcriptId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  }
}

export const voipCallRepository = {
  async create(input: InitiateCallInput): Promise<CallRecord> {
    const [row] = await db
      .insert(voipCall)
      .values({
        conversationId: input.conversationId,
        callerId: input.callerId,
        calleeId: input.calleeId ?? null,
        callType: input.callType,
        status: 'pending',
        startedAt: new Date(),
      })
      .returning()
    return toRecord(row)
  },

  async findById(callId: string): Promise<CallRecord | null> {
    const [row] = await db.select().from(voipCall).where(eq(voipCall.id, callId)).limit(1)
    return row ? toRecord(row) : null
  },

  async update(
    callId: string,
    patch: Partial<{
      status: CallStatus
      endedAt: Date
      duration: string
      endedBy: string
      recordingUrl: string
      transcriptId: string
      calleeId: string
    }>
  ): Promise<CallRecord | null> {
    const [row] = await db.update(voipCall).set(patch).where(eq(voipCall.id, callId)).returning()
    return row ? toRecord(row) : null
  },

  async findPendingOlderThan(threshold: Date): Promise<CallRecord[]> {
    const rows = await db
      .select()
      .from(voipCall)
      .where(and(eq(voipCall.status, 'pending'), lt(voipCall.startedAt, threshold)))
      .limit(100)
    return rows.map(toRecord)
  },

  async findActiveForUser(userId: string): Promise<CallRecord[]> {
    const rows = await db
      .select()
      .from(voipCall)
      .where(
        and(
          or(eq(voipCall.callerId, userId), eq(voipCall.calleeId, userId)),
          or(eq(voipCall.status, 'pending'), eq(voipCall.status, 'active'))
        )
      )
      .orderBy(desc(voipCall.startedAt))
    return rows.map(toRecord)
  },

  async findHistory(query: CallHistoryQuery): Promise<CallHistoryResult> {
    const offset = Math.max(0, (query.page - 1) * query.limit)
    const userFilter = or(eq(voipCall.callerId, query.userId), eq(voipCall.calleeId, query.userId))
    const where = query.status ? and(userFilter, eq(voipCall.status, query.status)) : userFilter

    const [{ value: total }] = await db.select({ value: count() }).from(voipCall).where(where)

    const rows = await db
      .select()
      .from(voipCall)
      .where(where)
      .orderBy(desc(voipCall.startedAt))
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map(toRecord),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(total),
        totalPages: Math.max(1, Math.ceil(Number(total) / query.limit)),
      },
    }
  },

  async findOrgMembers(conversationId: string): Promise<string[]> {
    const [conv] = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)
    if (!conv) return []
    const rows = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, conv.organizationId))
    return rows.map((r) => r.userId)
  },

  async isUserMemberOfConversationOrg(conversationId: string, userId: string): Promise<boolean> {
    const [conv] = await db
      .select({ organizationId: conversation.organizationId })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)
    if (!conv) return false
    const [row] = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, conv.organizationId), eq(member.userId, userId)))
      .limit(1)
    return Boolean(row)
  },
}
