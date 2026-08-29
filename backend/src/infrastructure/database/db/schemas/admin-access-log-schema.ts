import { index, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const adminAccessLog = pgTable(
  'admin_access_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminSub: text('admin_sub').notNull(),
    adminEmail: text('admin_email'),
    resource: text('resource').notNull(),
    resourceId: text('resource_id'),
    action: text('action').notNull().default('read'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_admin_access_log_admin_created').on(table.adminSub, table.createdAt.desc()),
    index('idx_admin_access_log_resource').on(table.resource, table.resourceId),
  ]
)
