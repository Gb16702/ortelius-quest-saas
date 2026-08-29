import { relations } from 'drizzle-orm'
import { index, json, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'
import { quote } from './quote-schema'
import { request } from './request-schema'

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
}

export const invoiceStatusEnum = pgEnum(
  'invoice_status',
  Object.values(InvoiceStatus) as [string, ...string[]]
)

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
  unit?: string
}

export interface InvoicePricing {
  lines: InvoiceLine[]
  subtotal: number
  vatPercentage: number
  vatAmount: number
  totalAmount: number
  currency: string
  discountPercentage?: number
  discountAmount?: number
}

export const invoice = pgTable(
  'invoice',
  {
    id: text('id').primaryKey(),
    invoiceNumber: text('invoice_number').unique().notNull(),
    requestId: text('request_id')
      .references(() => request.id, { onDelete: 'cascade' })
      .notNull(),
    quoteId: text('quote_id')
      .references(() => quote.id, { onDelete: 'cascade' })
      .notNull(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    createdById: text('created_by_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    pricing: json('pricing').$type<InvoicePricing>().notNull(),

    description: text('description'),
    terms: text('terms'),
    notes: text('notes'),

    issueDate: timestamp('issue_date').notNull(),
    dueDate: timestamp('due_date').notNull(),

    status: invoiceStatusEnum('status').default('draft').notNull(),

    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_invoice_request').on(table.requestId),
    index('idx_invoice_quote').on(table.quoteId),
    index('idx_invoice_org_created').on(table.organizationId, table.createdAt.desc()),
  ]
)

export const invoiceRelations = relations(invoice, ({ one }) => ({
  request: one(request, {
    fields: [invoice.requestId],
    references: [request.id],
  }),
  quote: one(quote, {
    fields: [invoice.quoteId],
    references: [quote.id],
  }),
  organization: one(organization, {
    fields: [invoice.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [invoice.createdById],
    references: [user.id],
  }),
}))

export type Invoice = typeof invoice.$inferSelect
export type NewInvoice = typeof invoice.$inferInsert
