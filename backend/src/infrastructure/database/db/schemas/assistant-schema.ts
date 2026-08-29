import {
  bigserial,
  boolean,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'

export const assistantConversation = pgTable(
  'assistant_conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    lastRoutePath: text('last_route_path'),
    summary: text('summary'),
    summaryMessageCount: integer('summary_message_count').notNull().default(0),
    summaryTokenEstimate: integer('summary_token_estimate').notNull().default(0),
    summaryUpdatedAt: timestamp('summary_updated_at'),
    realtimeSequence: integer('realtime_sequence').notNull().default(0),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_assistant_conversation_user_updated').on(table.userId, table.updatedAt.desc()),
    index('idx_assistant_conversation_user_active_updated').on(
      table.userId,
      table.deletedAt,
      table.updatedAt.desc()
    ),
    index('idx_assistant_conversation_org_updated').on(
      table.organizationId,
      table.updatedAt.desc()
    ),
  ]
)

export const assistantMessage = pgTable(
  'assistant_message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => assistantConversation.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_assistant_message_conversation_created').on(table.conversationId, table.createdAt),
  ]
)

export const assistantAttachment = pgTable(
  'assistant_attachment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'set null',
    }),
    conversationId: uuid('conversation_id').references(() => assistantConversation.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => assistantMessage.id, {
      onDelete: 'set null',
    }),
    filename: text('filename').notNull(),
    originalName: text('original_name').notNull(),
    size: integer('size').notNull(),
    mimeType: text('mime_type').notNull(),
    s3Key: text('s3_key').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_assistant_attachment_user_created').on(table.userId, table.createdAt.desc()),
    index('idx_assistant_attachment_user_org_created').on(
      table.userId,
      table.organizationId,
      table.createdAt.desc()
    ),
    index('idx_assistant_attachment_conversation_created').on(
      table.conversationId,
      table.createdAt.desc()
    ),
    index('idx_assistant_attachment_message').on(table.messageId),
  ]
)

export const assistantMessageAttachment = pgTable(
  'assistant_message_attachment',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => assistantMessage.id, { onDelete: 'cascade' }),
    attachmentId: uuid('attachment_id')
      .notNull()
      .references(() => assistantAttachment.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.messageId, table.attachmentId],
      name: 'assistant_message_attachment_pk',
    }),
    index('idx_assistant_message_attachment_attachment').on(table.attachmentId),
  ]
)

export const assistantAction = pgTable(
  'assistant_action',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => assistantConversation.id, {
      onDelete: 'set null',
    }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'set null',
    }),
    type: text('type').notNull(),
    status: text('status', {
      enum: ['proposed', 'executed', 'cancelled', 'expired', 'failed'],
    })
      .notNull()
      .default('proposed'),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    buttonLabel: text('button_label').notNull(),
    riskLevel: text('risk_level', { enum: ['low', 'medium', 'high', 'destructive'] }).notNull(),
    requiresConfirmation: boolean('requires_confirmation').notNull().default(true),
    payload: json('payload').notNull(),
    preview: json('preview'),
    result: json('result'),
    errorMessage: text('error_message'),
    expiresAt: timestamp('expires_at').notNull(),
    confirmedAt: timestamp('confirmed_at'),
    executedAt: timestamp('executed_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_assistant_action_user_status').on(table.userId, table.status),
    index('idx_assistant_action_conversation_created').on(table.conversationId, table.createdAt),
    index('idx_assistant_action_org_created').on(table.organizationId, table.createdAt),
  ]
)

export const assistantSyncAction = pgTable(
  'assistant_sync_action',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    syncId: integer('sync_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'set null',
    }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => assistantConversation.id, { onDelete: 'cascade' }),
    modelName: text('model_name').notNull(),
    modelId: text('model_id').notNull(),
    operation: text('operation', { enum: ['insert', 'update', 'delete'] }).notNull(),
    payload: json('payload').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_assistant_sync_action_user_sync').on(table.userId, table.syncId),
    index('idx_assistant_sync_action_user_sync').on(table.userId, table.syncId),
    index('idx_assistant_sync_action_org_sync').on(table.organizationId, table.syncId),
    index('idx_assistant_sync_action_conversation_sync').on(table.conversationId, table.syncId),
  ]
)
