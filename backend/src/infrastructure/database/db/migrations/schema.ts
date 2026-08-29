import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const fragilityType = pgEnum('fragility_type', ['fragile', 'robust'])
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent'])
export const quoteStatus = pgEnum('quote_status', ['draft', 'sent', 'rejected', 'expired'])
export const requestLifecycleStatus = pgEnum('request_lifecycle_status', [
  'draft',
  'open',
  'quoted',
  'invoiced',
  'closed',
])
export const requestClosedReason = pgEnum('request_closed_reason', [
  'request_rejected',
  'quote_rejected',
  'cancelled',
  'expired',
])
export const serviceType = pgEnum('service_type', ['cargo', 'storage', 'logistics', 'port'])

export const verification = pgTable('verification', {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
})

export const service = pgTable('service', {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  type: serviceType().notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
})

export const organizationMetricsDaily = pgTable(
  'organization_metrics_daily',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    date: timestamp({ mode: 'string' }).notNull(),
    requestsReceived: integer('requests_received').default(0).notNull(),
    newVisitors: integer('new_visitors').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_org_metrics_daily_org_date').using(
      'btree',
      table.organizationId.asc().nullsLast().op('text_ops'),
      table.date.desc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'organization_metrics_daily_organization_id_organization_id_fk',
    }).onDelete('cascade'),
  ]
)

export const organizationMetrics = pgTable(
  'organization_metrics',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    totalRequestsReceived: integer('total_requests_received').default(0).notNull(),
    totalNewVisitors: integer('total_new_visitors').default(0).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'organization_metrics_organization_id_organization_id_fk',
    }).onDelete('cascade'),
  ]
)

export const organizationPublicPageVisitor = pgTable(
  'organization_public_page_visitor',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    visitorHash: text('visitor_hash').notNull(),
    firstSeenAt: timestamp('first_seen_at', { mode: 'string' }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_org_public_page_visitor_first_seen').using(
      'btree',
      table.organizationId.asc().nullsLast().op('text_ops'),
      table.firstSeenAt.desc().nullsLast().op('timestamp_ops')
    ),
    unique('idx_org_public_page_visitor_unique').on(table.organizationId, table.visitorHash),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'organization_public_page_visitor_organization_id_organization_id_fk',
    }).onDelete('cascade'),
  ]
)

export const notification = pgTable(
  'notification',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    type: text().notNull(),
    title: text(),
    message: text().notNull(),
    data: text(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    readAt: timestamp('read_at', { mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'notification_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'string' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'string' }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'account_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const messageRead = pgTable(
  'message_read',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    messageId: uuid('message_id').notNull(),
    userId: text('user_id').notNull(),
    readAt: timestamp('read_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_message_read_message_user').using(
      'btree',
      table.messageId.asc().nullsLast().op('text_ops'),
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_message_read_user_message').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
      table.messageId.asc().nullsLast().op('text_ops')
    ),
    index('unique_message_user_read').using(
      'btree',
      table.messageId.asc().nullsLast().op('text_ops'),
      table.userId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [message.id],
      name: 'message_read_message_id_message_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'message_read_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const member = pgTable(
  'member',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    userId: text('user_id').notNull(),
    role: text().default('member').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { mode: 'string' }),
  },
  (table) => [
    index('idx_member_org_role').using(
      'btree',
      table.organizationId.asc().nullsLast().op('text_ops'),
      table.role.asc().nullsLast().op('text_ops')
    ),
    index('idx_member_user_org_active').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.organizationId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'member_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'member_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const conversationParticipant = pgTable(
  'conversation_participant',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    conversationId: uuid('conversation_id').notNull(),
    userId: text('user_id').notNull(),
    joinedAt: timestamp('joined_at', { mode: 'string' }).notNull(),
    leftAt: timestamp('left_at', { mode: 'string' }),
    role: text().default('member').notNull(),
  },
  (table) => [
    index('idx_conversation_participant_conversation_user').using(
      'btree',
      table.conversationId.asc().nullsLast().op('uuid_ops'),
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_conversation_participants_for_listing').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.conversationId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversation.id],
      name: 'conversation_participant_conversation_id_conversation_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'conversation_participant_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const session = pgTable(
  'session',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull(),
    activeOrganizationId: text('active_organization_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'session_user_id_user_id_fk',
    }).onDelete('cascade'),
    unique('session_token_unique').on(table.token),
  ]
)

export const messageReaction = pgTable(
  'message_reaction',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    messageId: uuid('message_id').notNull(),
    userId: text('user_id').notNull(),
    emoji: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [message.id],
      name: 'message_reaction_message_id_message_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'message_reaction_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const voipCallParticipant = pgTable(
  'voip_call_participant',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    callId: uuid('call_id').notNull(),
    userId: text('user_id').notNull(),
    joinedAt: timestamp('joined_at', { mode: 'string' }),
    leftAt: timestamp('left_at', { mode: 'string' }),
    status: text().default('invited').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_voip_call_participant_call_id').using(
      'btree',
      table.callId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_voip_call_participant_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    index('idx_voip_call_participant_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops')
    ),
    index('unique_call_user').using(
      'btree',
      table.callId.asc().nullsLast().op('uuid_ops'),
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.callId],
      foreignColumns: [voipCall.id],
      name: 'voip_call_participant_call_id_voip_call_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'voip_call_participant_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const invoice = pgTable(
  'invoice',
  {
    id: text().primaryKey().notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    requestId: text('request_id').notNull(),
    quoteId: text('quote_id').notNull(),
    organizationId: text('organization_id').notNull(),
    createdById: text('created_by_id').notNull(),
    pricing: json().notNull(),
    description: text(),
    terms: text(),
    notes: text(),
    issueDate: timestamp('issue_date', { mode: 'string' }).notNull(),
    dueDate: timestamp('due_date', { mode: 'string' }).notNull(),
    status: invoiceStatus().default('draft').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_invoice_org_created').using(
      'btree',
      table.organizationId.asc().nullsLast().op('text_ops'),
      table.createdAt.desc().nullsLast().op('timestamp_ops')
    ),
    index('idx_invoice_quote').using('btree', table.quoteId.asc().nullsLast().op('text_ops')),
    index('idx_invoice_request').using('btree', table.requestId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.requestId],
      foreignColumns: [request.id],
      name: 'invoice_request_id_request_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.quoteId],
      foreignColumns: [quote.id],
      name: 'invoice_quote_id_quote_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'invoice_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: 'invoice_created_by_id_user_id_fk',
    }).onDelete('cascade'),
    unique('invoice_invoice_number_unique').on(table.invoiceNumber),
  ]
)

export const quote = pgTable(
  'quote',
  {
    id: text().primaryKey().notNull(),
    quoteNumber: text('quote_number').notNull(),
    requestId: text('request_id').notNull(),
    organizationId: text('organization_id').notNull(),
    createdById: text('created_by_id').notNull(),
    cargoTypes: json('cargo_types'),
    cargoDetails: json('cargo_details'),
    services: json(),
    timing: json(),
    documents: json(),
    comments: json(),
    pricing: json().notNull(),
    description: text(),
    terms: text(),
    validUntil: timestamp('valid_until', { mode: 'string' }).notNull(),
    status: quoteStatus().default('draft').notNull(),
    version: integer().default(1).notNull(),
    respondedAt: timestamp('responded_at', { mode: 'string' }),
    respondedById: text('responded_by_id'),
    rejectionReason: text('rejection_reason'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_quote_request_created').using(
      'btree',
      table.requestId.asc().nullsLast().op('text_ops'),
      table.createdAt.desc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.requestId],
      foreignColumns: [request.id],
      name: 'quote_request_id_request_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'quote_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: 'quote_created_by_id_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.respondedById],
      foreignColumns: [user.id],
      name: 'quote_responded_by_id_user_id_fk',
    }).onDelete('set null'),
    unique('quote_quote_number_unique').on(table.quoteNumber),
  ]
)

export const invitation = pgTable(
  'invitation',
  {
    id: text().primaryKey().notNull(),
    organizationId: text('organization_id').notNull(),
    email: text().notNull(),
    role: text(),
    status: text().default('pending').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    inviterId: text('inviter_id').notNull(),
    archived: boolean().default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'invitation_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.inviterId],
      foreignColumns: [user.id],
      name: 'invitation_inviter_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const transcripts = pgTable(
  'transcripts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    callId: uuid('call_id').notNull(),
    conversationId: uuid('conversation_id').notNull(),
    audioKey: text('audio_key').notNull(),
    text: text().notNull(),
    segments: text(),
    status: text().default('pending'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversation.id],
      name: 'transcripts_conversation_id_conversation_id_fk',
    }).onDelete('cascade'),
  ]
)

export const anonymousUser = pgTable(
  'anonymous_user',
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    name: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  },
  (table) => [unique('anonymous_user_email_unique').on(table.email)]
)

export const user = pgTable(
  'user',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean('email_verified').notNull(),
    image: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    twoFactorEnabled: boolean('two_factor_enabled'),
    role: text().default('member').notNull(),
    banner: text(),
  },
  (table) => [unique('user_email_unique').on(table.email)]
)

export const conversation = pgTable(
  'conversation',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text(),
    description: text(),
    createdBy: text('created_by').notNull(),
    organizationId: text('organization_id').notNull(),
    requesterId: text('requester_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    anonymousRequesterId: text('anonymous_requester_id'),
    isTeamChat: boolean('is_team_chat').default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.anonymousRequesterId],
      foreignColumns: [anonymousUser.id],
      name: 'conversation_anonymous_requester_id_anonymous_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: 'conversation_created_by_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'conversation_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [user.id],
      name: 'conversation_requester_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const organization = pgTable(
  'organization',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    slug: text(),
    subdomain: text(),
    logo: text(),
    brandLogo: text('brand_logo'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    metadata: text(),
  },
  (table) => [
    unique('organization_slug_unique').on(table.slug),
    unique('organization_subdomain_unique').on(table.subdomain),
  ]
)

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text().primaryKey().notNull(),
    secret: text().notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'two_factor_user_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const category = pgTable('category', {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
})

export const message = pgTable(
  'message',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    conversationId: uuid('conversation_id').notNull(),
    senderId: text('sender_id').notNull(),
    content: text().notNull(),
    messageType: text('message_type').default('text').notNull(),
    replyToId: uuid('reply_to_id'),
    metadata: json(),
    isEdited: boolean('is_edited').default(false).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('idx_message_conversation_created').using(
      'btree',
      table.conversationId.asc().nullsLast().op('timestamp_ops'),
      table.createdAt.desc().nullsLast().op('timestamp_ops')
    ),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversation.id],
      name: 'message_conversation_id_conversation_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [user.id],
      name: 'message_sender_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const voipCall = pgTable(
  'voip_call',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    conversationId: uuid('conversation_id').notNull(),
    callerId: text('caller_id').notNull(),
    callType: text('call_type').notNull(),
    startedAt: timestamp('started_at', { mode: 'string' }).notNull(),
    endedAt: timestamp('ended_at', { mode: 'string' }),
    duration: text(),
    status: text().default('initiated').notNull(),
    metadata: json(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversation.id],
      name: 'voip_call_conversation_id_conversation_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.callerId],
      foreignColumns: [user.id],
      name: 'voip_call_caller_id_user_id_fk',
    }).onDelete('cascade'),
  ]
)

export const dimensions = pgTable('dimensions', {
  id: text().primaryKey().notNull(),
  length: doublePrecision(),
  width: doublePrecision(),
  height: doublePrecision(),
})

export const cargoDetails = pgTable(
  'cargo_details',
  {
    id: text().primaryKey().notNull(),
    weight: doublePrecision(),
    volume: doublePrecision(),
    dimensionsId: text('dimensions_id'),
    palletCount: integer('pallet_count'),
    fragility: fragilityType(),
    options: json(),
  },
  (table) => [
    foreignKey({
      columns: [table.dimensionsId],
      foreignColumns: [dimensions.id],
      name: 'cargo_details_dimensions_id_dimensions_id_fk',
    }).onDelete('cascade'),
  ]
)

export const request = pgTable(
  'request',
  {
    id: text().primaryKey().notNull(),
    reqNumber: text('req_number').notNull(),
    requesterEmail: text('requester_email').notNull(),
    requesterName: text('requester_name').notNull(),
    requesterPhone: text('requester_phone'),
    requesterId: text('requester_id'),
    receiverOrganizationId: text('receiver_organization_id').notNull(),
    conversationId: uuid('conversation_id'),
    categories: json(),
    services: json(),
    extraServices: json('extra_services'),
    cargoDetailsId: text('cargo_details_id'),
    comments: text(),
    documents: json(),
    lifecycleStatus: requestLifecycleStatus('lifecycle_status').default('open').notNull(),
    closedReason: requestClosedReason('closed_reason'),
    fromDate: timestamp('from_date', { mode: 'string' }).notNull(),
    toDate: timestamp('to_date', { mode: 'string' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
    assignedToId: text('assigned_to_id'),
    assignedAt: timestamp('assigned_at', { mode: 'string' }),
    assignedById: text('assigned_by_id'),
  },
  (table) => [
    index('idx_request_assigned_to_lifecycle_status').using(
      'btree',
      table.assignedToId.asc().nullsLast().op('text_ops'),
      table.lifecycleStatus.asc().nullsLast().op('enum_ops')
    ),
    index('idx_request_org_assigned').using(
      'btree',
      table.receiverOrganizationId.asc().nullsLast().op('text_ops'),
      table.assignedToId.asc().nullsLast().op('text_ops')
    ),
    index('idx_request_org_lifecycle_status').using(
      'btree',
      table.receiverOrganizationId.asc().nullsLast().op('enum_ops'),
      table.lifecycleStatus.asc().nullsLast().op('enum_ops')
    ),
    index('idx_request_requester_created').using(
      'btree',
      table.requesterId.asc().nullsLast().op('timestamp_ops'),
      table.createdAt.desc().nullsLast().op('timestamp_ops')
    ),
    foreignKey({
      columns: [table.assignedToId],
      foreignColumns: [user.id],
      name: 'request_assigned_to_id_user_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.assignedById],
      foreignColumns: [user.id],
      name: 'request_assigned_by_id_user_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [user.id],
      name: 'request_requester_id_user_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.receiverOrganizationId],
      foreignColumns: [organization.id],
      name: 'request_receiver_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversation.id],
      name: 'request_conversation_id_conversation_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.cargoDetailsId],
      foreignColumns: [cargoDetails.id],
      name: 'request_cargo_details_id_cargo_details_id_fk',
    }).onDelete('cascade'),
    unique('request_req_number_unique').on(table.reqNumber),
  ]
)

export const organizationCategories = pgTable(
  'organization_categories',
  {
    organizationId: text('organization_id').notNull(),
    categoryId: text('category_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'organization_categories_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [category.id],
      name: 'organization_categories_category_id_category_id_fk',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.organizationId, table.categoryId],
      name: 'organization_categories_organization_id_category_id_pk',
    }),
  ]
)

export const organizationServices = pgTable(
  'organization_services',
  {
    organizationId: text('organization_id').notNull(),
    serviceId: text('service_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: 'organization_services_organization_id_organization_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [service.id],
      name: 'organization_services_service_id_service_id_fk',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.organizationId, table.serviceId],
      name: 'organization_services_organization_id_service_id_pk',
    }),
  ]
)
