import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { legalDocument } from './legal-document-schema'
import { quote } from './quote-schema'

export const quoteLegalDocument = pgTable(
  'quote_legal_document',
  {
    quoteId: text('quote_id')
      .notNull()
      .references(() => quote.id, { onDelete: 'cascade' }),
    legalDocumentId: uuid('legal_document_id')
      .notNull()
      .references(() => legalDocument.id, { onDelete: 'restrict' }),
    labelSnapshot: text('label_snapshot').notNull(),
    originalFilenameSnapshot: text('original_filename_snapshot').notNull(),
    sizeBytesSnapshot: integer('size_bytes_snapshot').notNull(),
    s3KeySnapshot: text('s3_key_snapshot').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.quoteId, t.legalDocumentId] }),
    index('idx_quote_legal_doc_quote').on(t.quoteId),
  ]
)

export type QuoteLegalDocumentRow = typeof quoteLegalDocument.$inferSelect
export type NewQuoteLegalDocument = typeof quoteLegalDocument.$inferInsert
