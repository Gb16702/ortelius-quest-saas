import { index, json, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'

export const activityEvent = pgTable(
  'activity_event',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    description: text('description').notNull(),
    metadata: json('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_activity_org_created').on(table.organizationId, table.createdAt.desc()),
    index('idx_activity_org_type_created').on(
      table.organizationId,
      table.eventType,
      table.createdAt.desc()
    ),
    index('idx_activity_actor').on(table.actorId),
  ]
)
