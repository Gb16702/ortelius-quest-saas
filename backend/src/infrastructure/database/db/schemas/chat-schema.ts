import { relations } from 'drizzle-orm'
import { boolean, index, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { anonymousUser, organization, user } from './auth-schema'

export const conversation = pgTable(
  'conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    description: text('description'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    requesterId: text('requester_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    anonymousRequesterId: text('anonymous_requester_id').references(() => anonymousUser.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
    isTeamChat: boolean('is_team_chat').default(false).notNull(),
  },
  (table) => [index('idx_conversation_team_chat').on(table.organizationId, table.isTeamChat)]
)

export const conversationParticipant = pgTable(
  'conversation_participant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at')
      .$defaultFn(() => new Date())
      .notNull(),
    leftAt: timestamp('left_at'),
    role: text('role').default('member').notNull(),
    isPinned: boolean('is_pinned').default(false).notNull(),
    pinnedAt: timestamp('pinned_at'),
  },
  (table) => [
    index('idx_conversation_participant_conversation_user').on(table.conversationId, table.userId),
    index('idx_conversation_participants_for_listing').on(table.userId, table.conversationId),
  ]
)

export const message = pgTable(
  'message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    messageType: text('message_type').default('text').notNull(),
    replyToId: uuid('reply_to_id'),
    metadata: json('metadata'),
    isEdited: boolean('is_edited').default(false).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    isPinned: boolean('is_pinned').default(false).notNull(),
    pinnedAt: timestamp('pinned_at'),
    pinnedById: text('pinned_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_message_conversation_created').on(table.conversationId, table.createdAt.desc()),
    index('idx_message_conversation_pinned').on(table.conversationId, table.isPinned),
  ]
)

export const messageReaction = pgTable('message_reaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
})

export const voipCall = pgTable('voip_call', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  callerId: text('caller_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  calleeId: text('callee_id').references(() => user.id, { onDelete: 'set null' }),
  callType: text('call_type', { enum: ['audio', 'video'] }).notNull(),
  startedAt: timestamp('started_at')
    .$defaultFn(() => new Date())
    .notNull(),
  endedAt: timestamp('ended_at'),
  duration: text('duration'),
  status: text('status', {
    enum: ['pending', 'active', 'ended', 'rejected', 'missed'],
  })
    .default('pending')
    .notNull(),
  endedBy: text('ended_by').references(() => user.id, { onDelete: 'set null' }),
  recordingUrl: text('recording_url'),
  transcriptId: uuid('transcript_id'),
  metadata: json('metadata'),
})

export const voipCallParticipant = pgTable(
  'voip_call_participant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    callId: uuid('call_id')
      .notNull()
      .references(() => voipCall.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').$defaultFn(() => new Date()),
    leftAt: timestamp('left_at'),
    status: text('status').default('invited').notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_voip_call_participant_call_id').on(table.callId),
    index('idx_voip_call_participant_user_id').on(table.userId),
    index('idx_voip_call_participant_status').on(table.status),
    index('unique_call_user').on(table.callId, table.userId),
  ]
)

export const messageRead = pgTable(
  'message_read',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_message_read_message_user').on(table.messageId, table.userId),
    index('idx_message_read_user_message').on(table.userId, table.messageId),
    index('unique_message_user_read').on(table.messageId, table.userId),
  ]
)

export const notification = pgTable('notification', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title'),
  message: text('message').notNull(),
  data: text('data'),
  isRead: boolean('is_read').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  readAt: timestamp('read_at'),
})

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [conversation.createdBy],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [conversation.organizationId],
    references: [organization.id],
  }),
  requester: one(user, {
    fields: [conversation.requesterId],
    references: [user.id],
    relationName: 'requester_conversations',
  }),
  participants: many(conversationParticipant),
  messages: many(message),
}))

export const conversationParticipantRelations = relations(conversationParticipant, ({ one }) => ({
  conversation: one(conversation, {
    fields: [conversationParticipant.conversationId],
    references: [conversation.id],
  }),
  user: one(user, {
    fields: [conversationParticipant.userId],
    references: [user.id],
  }),
}))

export const messageRelations = relations(message, ({ one, many }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  sender: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
  pinnedBy: one(user, {
    fields: [message.pinnedById],
    references: [user.id],
    relationName: 'pinned_messages',
  }),
  replyTo: one(message, {
    fields: [message.replyToId],
    references: [message.id],
    relationName: 'reply_to',
  }),
  replies: many(message, {
    relationName: 'reply_to',
  }),
  reactions: many(messageReaction),
  reads: many(messageRead),
}))

export const messageReadRelations = relations(messageRead, ({ one }) => ({
  message: one(message, {
    fields: [messageRead.messageId],
    references: [message.id],
  }),
  user: one(user, {
    fields: [messageRead.userId],
    references: [user.id],
  }),
}))

export const messageReactionRelations = relations(messageReaction, ({ one }) => ({
  message: one(message, {
    fields: [messageReaction.messageId],
    references: [message.id],
  }),
  user: one(user, {
    fields: [messageReaction.userId],
    references: [user.id],
  }),
}))

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}))

export const voipCallRelations = relations(voipCall, ({ one, many }) => ({
  conversation: one(conversation, {
    fields: [voipCall.conversationId],
    references: [conversation.id],
  }),
  caller: one(user, {
    fields: [voipCall.callerId],
    references: [user.id],
    relationName: 'caller_calls',
  }),
  participants: many(voipCallParticipant),
}))

export const voipCallParticipantRelations = relations(voipCallParticipant, ({ one }) => ({
  call: one(voipCall, {
    fields: [voipCallParticipant.callId],
    references: [voipCall.id],
  }),
  user: one(user, {
    fields: [voipCallParticipant.userId],
    references: [user.id],
  }),
}))
