import { Buffer } from 'node:buffer'
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  assistantAction,
  assistantAttachment,
  assistantConversation,
  assistantMessage,
  assistantMessageAttachment,
  assistantSyncAction,
} from '../../../infrastructure/database/db/schemas/assistant-schema'
import {
  invitation,
  member,
  organization,
  subscription,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import { documentsApplicationService } from '../../documents/documents.application'
import type {
  AssistantAction,
  AssistantAttachment,
  AssistantConversation,
  AssistantMessage,
  AssistantSyncAction,
} from '../application/assistant-models'
import type {
  AssistantMessageWithConversation,
  AssistantOrganizationContext,
  AssistantRepositoryPort,
  AttachAssistantAttachmentsToMessageInput,
  CreateAssistantActionInput,
  CreateAssistantAttachmentInput,
  CreateAssistantConversationInput,
  CreateAssistantMessageInput,
  CreateAssistantSyncActionInput,
  ListAssistantAttachmentsInput,
  ListAssistantAttachmentsResult,
  ListAssistantSyncActionsResult,
  SoftDeleteAssistantConversationInput,
  SoftDeleteAssistantConversationResult,
  UpdateAssistantActionInput,
  UpdateAssistantConversationSummaryInput,
  UpdateAssistantConversationTitleInput,
} from '../application/ports'

const ASSISTANT_ATTACHMENT_CURSOR_VERSION = 1

interface AssistantAttachmentCursorPayload {
  v: typeof ASSISTANT_ATTACHMENT_CURSOR_VERSION
  createdAt: string
  id: string
}

function mapConversation(row: typeof assistantConversation.$inferSelect): AssistantConversation {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    title: row.title,
    lastRoutePath: row.lastRoutePath,
    summary: row.summary,
    summaryMessageCount: row.summaryMessageCount,
    summaryTokenEstimate: row.summaryTokenEstimate,
    summaryUpdatedAt: row.summaryUpdatedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapMessage(row: typeof assistantMessage.$inferSelect): AssistantMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
  }
}

function mapAttachment(row: typeof assistantAttachment.$inferSelect): AssistantAttachment {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    conversationId: row.conversationId,
    messageId: row.messageId,
    filename: row.filename,
    originalName: row.originalName,
    size: row.size,
    mimeType: row.mimeType,
    s3Key: row.s3Key,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapAction(row: typeof assistantAction.$inferSelect): AssistantAction {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    organizationId: row.organizationId,
    type: row.type as AssistantAction['type'],
    status: row.status,
    title: row.title,
    summary: row.summary,
    buttonLabel: row.buttonLabel,
    riskLevel: row.riskLevel,
    requiresConfirmation: row.requiresConfirmation,
    payload: row.payload as Record<string, unknown>,
    preview: (row.preview as Record<string, unknown> | null) ?? null,
    result: (row.result as Record<string, unknown> | null) ?? null,
    errorMessage: row.errorMessage,
    expiresAt: row.expiresAt,
    confirmedAt: row.confirmedAt,
    executedAt: row.executedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapSyncAction(row: typeof assistantSyncAction.$inferSelect): AssistantSyncAction {
  return {
    syncId: row.syncId,
    userId: row.userId,
    organizationId: row.organizationId,
    conversationId: row.conversationId,
    modelName: row.modelName as AssistantSyncAction['modelName'],
    modelId: row.modelId,
    operation: row.operation,
    payload: row.payload as Record<string, unknown>,
    createdAt: row.createdAt,
  }
}

type AssistantRepositoryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function allocateNextAssistantSyncId(
  tx: AssistantRepositoryTransaction,
  userId: string
): Promise<number> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId})::bigint)`)

  const [row] = await tx
    .select({
      lastSyncId: sql<number | null>`max(${assistantSyncAction.syncId})`,
    })
    .from(assistantSyncAction)
    .where(eq(assistantSyncAction.userId, userId))

  return Number(row?.lastSyncId ?? 0) + 1
}

async function insertAssistantSyncAction(
  tx: AssistantRepositoryTransaction,
  input: CreateAssistantSyncActionInput & { createdAt?: Date }
): Promise<AssistantSyncAction> {
  const syncId = await allocateNextAssistantSyncId(tx, input.userId)
  const [row] = await tx
    .insert(assistantSyncAction)
    .values({
      syncId,
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      conversationId: input.conversationId,
      modelName: input.modelName,
      modelId: input.modelId,
      operation: input.operation,
      payload: input.payload,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .returning()

  return mapSyncAction(row)
}

function serializeDate(date: Date): string {
  return date.toISOString()
}

function serializeConversationForSync(conversation: AssistantConversation) {
  return {
    id: conversation.id,
    userId: conversation.userId,
    organizationId: conversation.organizationId,
    title: conversation.title,
    lastRoutePath: conversation.lastRoutePath,
    createdAt: serializeDate(conversation.createdAt),
    updatedAt: serializeDate(conversation.updatedAt),
  }
}

function serializeMessageForSync(message: AssistantMessage) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    metadata: message.metadata,
    createdAt: serializeDate(message.createdAt),
  }
}

function serializeActionForSync(action: AssistantAction) {
  return {
    id: action.id,
    conversationId: action.conversationId,
    userId: action.userId,
    organizationId: action.organizationId,
    type: action.type,
    status: action.status,
    title: action.title,
    summary: action.summary,
    buttonLabel: action.buttonLabel,
    riskLevel: action.riskLevel,
    requiresConfirmation: action.requiresConfirmation,
    payload: action.payload,
    preview: action.preview,
    result: action.result,
    errorMessage: action.errorMessage,
    expiresAt: serializeDate(action.expiresAt),
    confirmedAt: action.confirmedAt?.toISOString() ?? null,
    executedAt: action.executedAt?.toISOString() ?? null,
    cancelledAt: action.cancelledAt?.toISOString() ?? null,
    createdAt: serializeDate(action.createdAt),
    updatedAt: serializeDate(action.updatedAt),
  }
}

function encodeAssistantAttachmentCursor(attachment: AssistantAttachment): string {
  const payload: AssistantAttachmentCursorPayload = {
    v: ASSISTANT_ATTACHMENT_CURSOR_VERSION,
    createdAt: attachment.createdAt.toISOString(),
    id: attachment.id,
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeAssistantAttachmentCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const payload = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    ) as AssistantAttachmentCursorPayload

    if (
      payload.v !== ASSISTANT_ATTACHMENT_CURSOR_VERSION ||
      typeof payload.id !== 'string' ||
      typeof payload.createdAt !== 'string'
    ) {
      throw new Error('Invalid cursor payload')
    }

    const createdAt = new Date(payload.createdAt)
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('Invalid cursor date')
    }

    return { createdAt, id: payload.id }
  } catch {
    throw new Error('Invalid assistant attachment cursor')
  }
}

async function populateAssistantAttachmentUrls(
  attachment: AssistantAttachment
): Promise<AssistantAttachment> {
  try {
    const [url, downloadUrl] = await Promise.all([
      documentsApplicationService.generateSignedUrl(attachment.s3Key, 3600),
      documentsApplicationService.generateSignedUrl(
        attachment.s3Key,
        3600,
        attachment.originalName
      ),
    ])

    return {
      ...attachment,
      url,
      downloadUrl,
    }
  } catch (error) {
    console.error(`Failed to generate signed URL for assistant attachment ${attachment.id}:`, error)
    return attachment
  }
}

async function populateAssistantAttachmentsUrls(
  attachments: AssistantAttachment[]
): Promise<AssistantAttachment[]> {
  return Promise.all(attachments.map(populateAssistantAttachmentUrls))
}

export class DrizzleAssistantRepository implements AssistantRepositoryPort {
  async createConversation(
    input: CreateAssistantConversationInput
  ): Promise<AssistantConversation> {
    const now = new Date()
    const row = await db.transaction(async (tx) => {
      const [conversationRow] = await tx
        .insert(assistantConversation)
        .values({
          ...(input.id ? { id: input.id } : {}),
          userId: input.userId,
          organizationId: input.organizationId,
          title: input.title,
          lastRoutePath: input.lastRoutePath,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      const conversation = mapConversation(conversationRow)
      await insertAssistantSyncAction(tx, {
        userId: conversation.userId,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        modelName: 'assistant_conversation',
        modelId: conversation.id,
        operation: 'insert',
        payload: {
          type: 'conversation_created',
          conversation: serializeConversationForSync(conversation),
        },
        createdAt: now,
      })

      return conversationRow
    })

    return mapConversation(row)
  }

  async findConversationForUser(
    conversationId: string,
    userId: string
  ): Promise<AssistantConversation | null> {
    const [row] = await db
      .select()
      .from(assistantConversation)
      .where(
        and(
          eq(assistantConversation.id, conversationId),
          eq(assistantConversation.userId, userId),
          isNull(assistantConversation.deletedAt)
        )
      )
      .limit(1)

    return row ? mapConversation(row) : null
  }

  async listMessages(conversationId: string, limit: number): Promise<AssistantMessage[]> {
    const rows = await db
      .select()
      .from(assistantMessage)
      .where(eq(assistantMessage.conversationId, conversationId))
      .orderBy(desc(assistantMessage.createdAt))
      .limit(limit)

    return rows.map(mapMessage).reverse()
  }

  async findMessageWithConversationForUser(
    messageId: string,
    userId: string
  ): Promise<AssistantMessageWithConversation | null> {
    const [row] = await db
      .select()
      .from(assistantMessage)
      .where(eq(assistantMessage.id, messageId))
      .limit(1)

    if (!row) return null

    const conversation = await this.findConversationForUser(row.conversationId, userId)
    if (!conversation) return null

    return {
      message: mapMessage(row),
      conversation,
    }
  }

  async countMessages(conversationId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistantMessage)
      .where(eq(assistantMessage.conversationId, conversationId))

    return row?.count ?? 0
  }

  async listMessagesAfterOffset(
    conversationId: string,
    offset: number,
    limit: number
  ): Promise<AssistantMessage[]> {
    const rows = await db
      .select()
      .from(assistantMessage)
      .where(eq(assistantMessage.conversationId, conversationId))
      .orderBy(asc(assistantMessage.createdAt))
      .limit(limit)
      .offset(offset)

    return rows.map(mapMessage)
  }

  async createMessage(input: CreateAssistantMessageInput): Promise<AssistantMessage> {
    const row = await db.transaction(async (tx) => {
      const [conversationRow] = await tx
        .select()
        .from(assistantConversation)
        .where(eq(assistantConversation.id, input.conversationId))
        .limit(1)

      if (!conversationRow) {
        throw new Error('Assistant conversation not found while creating message')
      }

      const [messageRow] = await tx
        .insert(assistantMessage)
        .values({
          ...(input.id ? { id: input.id } : {}),
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          metadata: input.metadata ?? null,
        })
        .returning()

      const message = mapMessage(messageRow)
      await insertAssistantSyncAction(tx, {
        userId: conversationRow.userId,
        organizationId: conversationRow.organizationId,
        conversationId: input.conversationId,
        modelName: 'assistant_message',
        modelId: message.id,
        operation: 'insert',
        payload: {
          type: 'message_inserted',
          message: serializeMessageForSync(message),
        },
        createdAt: message.createdAt,
      })

      return messageRow
    })

    return mapMessage(row)
  }

  async createAttachments(input: CreateAssistantAttachmentInput[]): Promise<AssistantAttachment[]> {
    if (input.length === 0) return []

    const now = new Date()
    const rows = await db
      .insert(assistantAttachment)
      .values(
        input.map((attachment) => ({
          userId: attachment.userId,
          organizationId: attachment.organizationId ?? null,
          conversationId: attachment.conversationId ?? null,
          messageId: attachment.messageId ?? null,
          filename: attachment.filename,
          originalName: attachment.originalName,
          size: attachment.size,
          mimeType: attachment.mimeType,
          s3Key: attachment.s3Key,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning()

    return populateAssistantAttachmentsUrls(rows.map(mapAttachment))
  }

  async findAttachmentsForUser(input: {
    userId: string
    attachmentIds: string[]
  }): Promise<AssistantAttachment[]> {
    if (input.attachmentIds.length === 0) return []

    const rows = await db
      .select()
      .from(assistantAttachment)
      .where(
        and(
          eq(assistantAttachment.userId, input.userId),
          inArray(assistantAttachment.id, input.attachmentIds)
        )
      )

    const attachmentsById = new Map(rows.map((row) => [row.id, mapAttachment(row)]))
    const orderedAttachments = input.attachmentIds
      .map((id) => attachmentsById.get(id))
      .filter((attachment): attachment is AssistantAttachment => Boolean(attachment))

    return populateAssistantAttachmentsUrls(orderedAttachments)
  }

  async listRecentAttachmentsForUser(input: {
    userId: string
    limit: number
  }): Promise<AssistantAttachment[]> {
    const rows = await db
      .select()
      .from(assistantAttachment)
      .where(eq(assistantAttachment.userId, input.userId))
      .orderBy(desc(assistantAttachment.createdAt), desc(assistantAttachment.id))
      .limit(input.limit)

    return populateAssistantAttachmentsUrls(rows.map(mapAttachment))
  }

  async listAttachmentsForUser(
    input: ListAssistantAttachmentsInput
  ): Promise<ListAssistantAttachmentsResult> {
    const conditions = [eq(assistantAttachment.userId, input.userId)]
    const trimmedSearch = input.search?.trim()

    if (trimmedSearch) {
      conditions.push(ilike(assistantAttachment.originalName, `%${trimmedSearch}%`))
    }

    if (input.cursor) {
      const cursor = decodeAssistantAttachmentCursor(input.cursor)
      const cursorCondition = or(
        lt(assistantAttachment.createdAt, cursor.createdAt),
        and(
          eq(assistantAttachment.createdAt, cursor.createdAt),
          lt(assistantAttachment.id, cursor.id)
        )
      )

      if (cursorCondition) {
        conditions.push(cursorCondition)
      }
    }

    const rows = await db
      .select()
      .from(assistantAttachment)
      .where(and(...conditions))
      .orderBy(desc(assistantAttachment.createdAt), desc(assistantAttachment.id))
      .limit(input.limit + 1)

    const attachments = rows.slice(0, input.limit).map(mapAttachment)
    const nextCursor =
      rows.length > input.limit && attachments.length > 0
        ? encodeAssistantAttachmentCursor(attachments[attachments.length - 1])
        : null

    return {
      attachments: await populateAssistantAttachmentsUrls(attachments),
      nextCursor,
    }
  }

  async attachAttachmentsToMessage(
    input: AttachAssistantAttachmentsToMessageInput
  ): Promise<AssistantAttachment[]> {
    if (input.attachmentIds.length === 0) return []

    await db
      .update(assistantAttachment)
      .set({
        conversationId: input.conversationId,
        messageId: input.messageId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assistantAttachment.userId, input.userId),
          inArray(assistantAttachment.id, input.attachmentIds),
          isNull(assistantAttachment.messageId)
        )
      )

    await db
      .insert(assistantMessageAttachment)
      .values(
        input.attachmentIds.map((attachmentId) => ({
          messageId: input.messageId,
          attachmentId,
        }))
      )
      .onConflictDoNothing()

    return this.findAttachmentsForUser({
      userId: input.userId,
      attachmentIds: input.attachmentIds,
    })
  }

  async updateConversationSummary(
    input: UpdateAssistantConversationSummaryInput
  ): Promise<AssistantConversation | null> {
    const [row] = await db
      .update(assistantConversation)
      .set({
        summary: input.summary,
        summaryMessageCount: input.summaryMessageCount,
        summaryTokenEstimate: input.summaryTokenEstimate,
        summaryUpdatedAt: input.summaryUpdatedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(assistantConversation.id, input.conversationId))
      .returning()

    return row ? mapConversation(row) : null
  }

  async updateConversationTitle(
    input: UpdateAssistantConversationTitleInput
  ): Promise<AssistantConversation | null> {
    const row = await db.transaction(async (tx) => {
      const updatedAt = input.updatedAt ?? new Date()
      const [conversationRow] = await tx
        .update(assistantConversation)
        .set({
          title: input.title,
          updatedAt,
        })
        .where(eq(assistantConversation.id, input.conversationId))
        .returning()

      if (!conversationRow) return null

      const conversation = mapConversation(conversationRow)
      await insertAssistantSyncAction(tx, {
        userId: conversation.userId,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        modelName: 'assistant_conversation',
        modelId: conversation.id,
        operation: 'update',
        payload: {
          type: 'title_updated',
          conversationId: conversation.id,
          title: conversation.title,
          conversation: serializeConversationForSync(conversation),
        },
        createdAt: updatedAt,
      })

      return conversationRow
    })

    return row ? mapConversation(row) : null
  }

  async softDeleteConversationForUser(
    input: SoftDeleteAssistantConversationInput
  ): Promise<SoftDeleteAssistantConversationResult | null> {
    const deletedAt = input.deletedAt ?? new Date()
    const updatedRow = await db.transaction(async (tx) => {
      const [conversationRow] = await tx
        .update(assistantConversation)
        .set({
          deletedAt,
          updatedAt: deletedAt,
        })
        .where(
          and(
            eq(assistantConversation.id, input.conversationId),
            eq(assistantConversation.userId, input.userId),
            isNull(assistantConversation.deletedAt)
          )
        )
        .returning()

      if (!conversationRow) return null

      const conversation = mapConversation(conversationRow)
      await insertAssistantSyncAction(tx, {
        userId: conversation.userId,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        modelName: 'assistant_conversation',
        modelId: conversation.id,
        operation: 'delete',
        payload: {
          type: 'conversation_deleted',
          conversationId: conversation.id,
          deletedAt: deletedAt.toISOString(),
        },
        createdAt: deletedAt,
      })

      return conversationRow
    })

    if (updatedRow) {
      return {
        conversation: mapConversation(updatedRow),
        deletedAt,
        alreadyDeleted: false,
      }
    }

    const [existingRow] = await db
      .select()
      .from(assistantConversation)
      .where(
        and(
          eq(assistantConversation.id, input.conversationId),
          eq(assistantConversation.userId, input.userId)
        )
      )
      .limit(1)

    if (!existingRow) return null

    return {
      conversation: mapConversation(existingRow),
      deletedAt: existingRow.deletedAt ?? deletedAt,
      alreadyDeleted: existingRow.deletedAt !== null,
    }
  }

  async createSyncAction(input: CreateAssistantSyncActionInput): Promise<AssistantSyncAction> {
    return db.transaction((tx) => insertAssistantSyncAction(tx, input))
  }

  async getLastSyncIdForUser(userId: string): Promise<number> {
    const [row] = await db
      .select({
        lastSyncId: sql<number | null>`max(${assistantSyncAction.syncId})`,
      })
      .from(assistantSyncAction)
      .where(eq(assistantSyncAction.userId, userId))

    return Number(row?.lastSyncId ?? 0)
  }

  async listSyncActionsForUser(input: {
    userId: string
    after: number
    limit: number
  }): Promise<ListAssistantSyncActionsResult> {
    const [bounds] = await db
      .select({
        firstSyncId: sql<number | null>`min(${assistantSyncAction.syncId})`,
        lastSyncId: sql<number | null>`max(${assistantSyncAction.syncId})`,
      })
      .from(assistantSyncAction)
      .where(eq(assistantSyncAction.userId, input.userId))
    const actions = await db
      .select()
      .from(assistantSyncAction)
      .where(
        and(
          eq(assistantSyncAction.userId, input.userId),
          gt(assistantSyncAction.syncId, input.after)
        )
      )
      .orderBy(asc(assistantSyncAction.syncId))
      .limit(input.limit + 1)
    const batch = actions.slice(0, input.limit)

    return {
      firstSyncId: Number(bounds?.firstSyncId ?? 0),
      lastSyncId: Number(bounds?.lastSyncId ?? 0),
      hasMore: actions.length > input.limit,
      actions: batch.map(mapSyncAction),
    }
  }

  async createAction(input: CreateAssistantActionInput): Promise<AssistantAction> {
    const now = new Date()
    const row = await db.transaction(async (tx) => {
      const [actionRow] = await tx
        .insert(assistantAction)
        .values({
          conversationId: input.conversationId,
          userId: input.userId,
          organizationId: input.organizationId,
          type: input.type,
          status: 'proposed',
          title: input.title,
          summary: input.summary,
          buttonLabel: input.buttonLabel,
          riskLevel: input.riskLevel,
          requiresConfirmation: input.requiresConfirmation,
          payload: input.payload,
          preview: input.preview ?? null,
          expiresAt: input.expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      const action = mapAction(actionRow)
      if (action.conversationId) {
        await insertAssistantSyncAction(tx, {
          userId: action.userId,
          organizationId: action.organizationId,
          conversationId: action.conversationId,
          modelName: 'assistant_action',
          modelId: action.id,
          operation: 'insert',
          payload: {
            type: 'action_proposed',
            action: serializeActionForSync(action),
          },
          createdAt: now,
        })
      }

      return actionRow
    })

    return mapAction(row)
  }

  async findActionForUser(actionId: string, userId: string): Promise<AssistantAction | null> {
    const [row] = await db
      .select()
      .from(assistantAction)
      .where(and(eq(assistantAction.id, actionId), eq(assistantAction.userId, userId)))
      .limit(1)

    return row ? mapAction(row) : null
  }

  async updateAction(input: UpdateAssistantActionInput): Promise<AssistantAction | null> {
    const row = await db.transaction(async (tx) => {
      const updatedAt = new Date()
      const [actionRow] = await tx
        .update(assistantAction)
        .set({
          status: input.status,
          updatedAt,
          ...(input.result ? { result: input.result } : {}),
          ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
          ...(input.confirmedAt ? { confirmedAt: input.confirmedAt } : {}),
          ...(input.executedAt ? { executedAt: input.executedAt } : {}),
          ...(input.cancelledAt ? { cancelledAt: input.cancelledAt } : {}),
        })
        .where(
          and(eq(assistantAction.id, input.actionId), eq(assistantAction.userId, input.userId))
        )
        .returning()

      if (!actionRow) return null

      const action = mapAction(actionRow)
      if (action.conversationId) {
        await insertAssistantSyncAction(tx, {
          userId: action.userId,
          organizationId: action.organizationId,
          conversationId: action.conversationId,
          modelName: 'assistant_action',
          modelId: action.id,
          operation: 'update',
          payload: {
            type: 'action_updated',
            action: serializeActionForSync(action),
          },
          createdAt: updatedAt,
        })
      }

      return actionRow
    })

    return row ? mapAction(row) : null
  }

  async userCanAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    return Boolean(row)
  }

  async getOrganizationContextForUser(
    userId: string,
    organizationId: string
  ): Promise<AssistantOrganizationContext | null> {
    const [organizationRow] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        tagline: organization.tagline,
        role: member.role,
      })
      .from(organization)
      .innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, userId)))
      .where(eq(organization.id, organizationId))
      .limit(1)

    if (!organizationRow) return null

    const [subscriptionRow] = await db
      .select({
        plan: subscription.plan,
        status: subscription.status,
        periodEnd: subscription.periodEnd,
        trialEnd: subscription.trialEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        updatedAt: subscription.updatedAt,
      })
      .from(subscription)
      .where(eq(subscription.referenceId, organizationId))
      .orderBy(desc(subscription.updatedAt))
      .limit(1)

    const [memberCountRow] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(member)
      .where(eq(member.organizationId, organizationId))

    const [pendingInvitationCountRow] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.status, 'pending'),
          eq(invitation.archived, false)
        )
      )

    return {
      organization: {
        id: organizationRow.id,
        name: organizationRow.name,
        slug: organizationRow.slug,
        status: organizationRow.status,
        tagline: organizationRow.tagline,
      },
      membership: {
        role: organizationRow.role,
      },
      subscription: subscriptionRow
        ? {
            plan: subscriptionRow.plan,
            status: subscriptionRow.status,
            periodEnd: subscriptionRow.periodEnd,
            trialEnd: subscriptionRow.trialEnd,
            cancelAtPeriodEnd: subscriptionRow.cancelAtPeriodEnd,
          }
        : null,
      usage: {
        memberCount: Number(memberCountRow?.count) || 0,
        pendingInvitationCount: Number(pendingInvitationCountRow?.count) || 0,
      },
    }
  }

  async touchConversation(input: {
    conversationId: string
    lastRoutePath?: string
    updatedAt?: Date
  }): Promise<void> {
    await db.transaction(async (tx) => {
      const updatedAt = input.updatedAt ?? new Date()
      const [conversationRow] = await tx
        .update(assistantConversation)
        .set({
          updatedAt,
          ...(input.lastRoutePath ? { lastRoutePath: input.lastRoutePath } : {}),
        })
        .where(eq(assistantConversation.id, input.conversationId))
        .returning()

      if (!conversationRow) return

      const conversation = mapConversation(conversationRow)
      await insertAssistantSyncAction(tx, {
        userId: conversation.userId,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        modelName: 'assistant_conversation',
        modelId: conversation.id,
        operation: 'update',
        payload: {
          type: 'conversation_updated',
          conversation: serializeConversationForSync(conversation),
        },
        createdAt: updatedAt,
      })
    })
  }
}

export const assistantRepository = new DrizzleAssistantRepository()
