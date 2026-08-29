import {
  doublePrecision,
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { organization } from './auth-schema'
import { service } from './services-schema'

export interface ImportBatchError {
  row: number
  message: string
}

export const importBatch = pgTable('import_batch', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .references(() => organization.id, { onDelete: 'cascade' })
    .notNull(),
  fileName: text('file_name').notNull(),
  rowCount: integer('row_count').notNull(),
  errorCount: integer('error_count').default(0).notNull(),
  errors: json('errors').$type<ImportBatchError[]>(),
  uploadedById: text('uploaded_by_id').notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
})

export const historicalTransaction = pgTable(
  'historical_transaction',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    serviceId: text('service_id')
      .references(() => service.id, { onDelete: 'cascade' })
      .notNull(),
    price: doublePrecision('price').notNull(),
    currency: text('currency').default('EUR').notNull(),
    cargoCategories: json('cargo_categories').$type<string[]>().notNull(),
    cargoWeight: doublePrecision('cargo_weight'),
    cargoVolume: doublePrecision('cargo_volume'),
    cargoIsHazardous: integer('cargo_is_hazardous').default(0).notNull(),
    cargoIsReefer: integer('cargo_is_reefer').default(0).notNull(),
    cargoIsOversized: integer('cargo_is_oversized').default(0).notNull(),
    source: text('source').notNull(),
    importBatchId: text('import_batch_id').references(() => importBatch.id, {
      onDelete: 'cascade',
    }),
    quoteId: text('quote_id'),
    transactionDate: timestamp('transaction_date').notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_ht_org_service').on(table.organizationId, table.serviceId),
    index('idx_ht_org_service_date').on(
      table.organizationId,
      table.serviceId,
      table.transactionDate
    ),
    index('idx_ht_import_batch').on(table.importBatchId),
  ]
)

export type ImportBatch = typeof importBatch.$inferSelect
export type NewImportBatch = typeof importBatch.$inferInsert
export type HistoricalTransaction = typeof historicalTransaction.$inferSelect
export type NewHistoricalTransaction = typeof historicalTransaction.$inferInsert
