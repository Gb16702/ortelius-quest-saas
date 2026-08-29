import { sql } from 'drizzle-orm'
import {
  check,
  doublePrecision,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'
import { conversation } from './chat-schema'

export enum EFragility {
  Fragile = 'fragile',
  Robust = 'robust',
}

export enum ECargoOptions {
  Refrigerated = 'refrigerated',
  Hazardous = 'hazardous',
  Oversized = 'oversized',
  Fragile = 'fragile',
}

export enum ERequestLifecycleStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  QUOTED = 'quoted',
  INVOICED = 'invoiced',
  CLOSED = 'closed',
}

export enum ERequestClosedReason {
  REQUEST_REJECTED = 'request_rejected',
  QUOTE_REJECTED = 'quote_rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export const fragilityEnum = pgEnum(
  'fragility_type',
  Object.values(EFragility) as [string, ...string[]]
)
export const requestLifecycleStatusEnum = pgEnum(
  'request_lifecycle_status',
  Object.values(ERequestLifecycleStatus) as [string, ...string[]]
)
export const requestClosedReasonEnum = pgEnum(
  'request_closed_reason',
  Object.values(ERequestClosedReason) as [string, ...string[]]
)

export const dimensions = pgTable('dimensions', {
  id: text('id').primaryKey(),
  length: doublePrecision('length'),
  width: doublePrecision('width'),
  height: doublePrecision('height'),
})

export const cargoDetails = pgTable('cargo_details', {
  id: text('id').primaryKey(),
  weight: doublePrecision('weight'),
  volume: doublePrecision('volume'),
  dimensionsId: text('dimensions_id').references(() => dimensions.id, {
    onDelete: 'cascade',
  }),
  palletCount: integer('pallet_count'),
  fragility: fragilityEnum('fragility'),
  options: json('options').$type<Record<ECargoOptions, boolean>>(),
})

export const request = pgTable(
  'request',
  {
    id: text('id').primaryKey(),
    reqNumber: text('req_number').unique().notNull(),
    requesterEmail: text('requester_email').notNull(),
    requesterName: text('requester_name').notNull(),
    requesterPhone: text('requester_phone'),
    requesterId: text('requester_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    receiverOrganizationId: text('receiver_organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    conversationId: uuid('conversation_id').references(() => conversation.id, {
      onDelete: 'set null',
    }),
    categories: json('categories').$type<string[]>(),
    services: json('services').$type<string[]>(),
    extraServices: json('extra_services').$type<string[]>(),
    cargoDetailsId: text('cargo_details_id').references(() => cargoDetails.id, {
      onDelete: 'cascade',
    }),
    comments: text('comments'),
    documents: json('documents').$type<string[]>(),
    lifecycleStatus: requestLifecycleStatusEnum('lifecycle_status').default('open').notNull(),
    closedReason: requestClosedReasonEnum('closed_reason'),
    assignedToId: text('assigned_to_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at'),
    assignedById: text('assigned_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    fromDate: timestamp('from_date').notNull(),
    toDate: timestamp('to_date').notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    sourceEmailId: text('source_email_id'),
  },
  (table) => [
    index('idx_request_requester_created').on(table.requesterId, table.createdAt.desc()),
    index('idx_request_org_lifecycle_status').on(
      table.receiverOrganizationId,
      table.lifecycleStatus
    ),
    index('idx_request_assigned_to_lifecycle_status').on(table.assignedToId, table.lifecycleStatus),
    index('idx_request_org_assigned').on(table.receiverOrganizationId, table.assignedToId),
    uniqueIndex('idx_request_source_email_id').on(table.sourceEmailId),
    check(
      'request_closed_reason_matches_lifecycle_status',
      sql`(${table.lifecycleStatus} = 'closed' AND ${table.closedReason} IS NOT NULL) OR (${table.lifecycleStatus} != 'closed' AND ${table.closedReason} IS NULL)`
    ),
  ]
)
