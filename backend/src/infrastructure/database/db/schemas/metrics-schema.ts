import { index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'

export const organizationMetrics = pgTable('organization_metrics', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .references(() => organization.id, { onDelete: 'cascade' })
    .notNull(),
  totalRequestsReceived: integer('total_requests_received').default(0).notNull(),
  totalNewVisitors: integer('total_new_visitors').default(0).notNull(),
  totalQuotesGenerated: integer('total_quotes_generated').default(0).notNull(),
  totalInvoicesCreated: integer('total_invoices_created').default(0).notNull(),
  totalRevenue: numeric('total_revenue', { precision: 10, scale: 2 }).default('0').notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
})

export const organizationMetricsDaily = pgTable(
  'organization_metrics_daily',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    date: timestamp('date').notNull(),
    requestsReceived: integer('requests_received').default(0).notNull(),
    newVisitors: integer('new_visitors').default(0).notNull(),
    quotesGenerated: integer('quotes_generated').default(0).notNull(),
    invoicesCreated: integer('invoices_created').default(0).notNull(),
    revenue: numeric('revenue', { precision: 10, scale: 2 }).default('0').notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_org_metrics_daily_org_date').on(table.organizationId, table.date.desc())]
)

export const organizationPublicPageVisitor = pgTable(
  'organization_public_page_visitor',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    visitorHash: text('visitor_hash').notNull(),
    firstSeenAt: timestamp('first_seen_at')
      .$defaultFn(() => new Date())
      .notNull(),
    lastSeenAt: timestamp('last_seen_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_org_public_page_visitor_unique').on(table.organizationId, table.visitorHash),
    index('idx_org_public_page_visitor_first_seen').on(
      table.organizationId,
      table.firstSeenAt.desc()
    ),
  ]
)

export const memberMetrics = pgTable(
  'member_metrics',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    requestsHandled: integer('requests_handled').default(0).notNull(),
    quotesCreated: integer('quotes_created').default(0).notNull(),
    invoicesCreated: integer('invoices_created').default(0).notNull(),
    totalRevenue: numeric('total_revenue', { precision: 10, scale: 2 }).default('0').notNull(),
    conversationsCount: integer('conversations_count').default(0).notNull(),
    messagesCount: integer('messages_count').default(0).notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_member_metrics_user_org').on(table.userId, table.organizationId)]
)

export const memberMetricsDaily = pgTable(
  'member_metrics_daily',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    date: timestamp('date').notNull(),
    requestsHandled: integer('requests_handled').default(0).notNull(),
    quotesCreated: integer('quotes_created').default(0).notNull(),
    invoicesCreated: integer('invoices_created').default(0).notNull(),
    revenue: numeric('revenue', { precision: 10, scale: 2 }).default('0').notNull(),
    messagesCount: integer('messages_count').default(0).notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_member_metrics_daily_user_org_date').on(
      table.userId,
      table.organizationId,
      table.date.desc()
    ),
  ]
)
