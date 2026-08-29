import { index, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'
import { voipCall } from './chat-schema'

export const callMetrics = pgTable(
  'call_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    callId: uuid('call_id')
      .notNull()
      .references(() => voipCall.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    timestamp: timestamp('timestamp').notNull(),
    metrics: json('metrics').notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_call_metrics_call_id').on(table.callId),
    index('idx_call_metrics_user_id').on(table.userId),
    index('idx_call_metrics_timestamp').on(table.timestamp),
  ]
)

export type CallMetricsRow = typeof callMetrics.$inferSelect
export type NewCallMetrics = typeof callMetrics.$inferInsert
