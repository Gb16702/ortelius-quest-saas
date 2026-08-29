import { boolean, index, integer, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const aiUsageLog = pgTable(
  'ai_usage_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feature: text('feature').notNull(),
    model: text('model').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    durationMs: integer('duration_ms'),
    success: boolean('success').notNull().default(true),
    error: text('error'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_ai_usage_log_feature_created').on(table.feature, table.createdAt.desc()),
    index('idx_ai_usage_log_created').on(table.createdAt.desc()),
  ]
)
