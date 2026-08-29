import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'

export const legalDocumentScanStatus = ['pending', 'clean', 'infected', 'error'] as const
export type LegalDocumentScanStatus = (typeof legalDocumentScanStatus)[number]

export const legalDocument = pgTable(
  'legal_document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),

    label: text('label').notNull(),

    s3Key: text('s3_key').notNull().unique(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    originalFilename: text('original_filename').notNull(),

    scanStatus: text('scan_status', { enum: legalDocumentScanStatus }).notNull().default('clean'),
    scanCompletedAt: timestamp('scan_completed_at'),

    uploadedById: text('uploaded_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [index('idx_legal_doc_org_scan').on(t.organizationId, t.scanStatus)]
)

export type LegalDocumentRow = typeof legalDocument.$inferSelect
