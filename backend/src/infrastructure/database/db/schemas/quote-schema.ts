import { relations } from 'drizzle-orm'
import { index, integer, json, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'
import { request } from './request-schema'

export enum EQuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export const quoteStatusEnum = pgEnum(
  'quote_status',
  Object.values(EQuoteStatus) as [string, ...string[]]
)

export interface IQuoteCargoDetail {
  amount: number
  checked: boolean
  price?: number
}

export interface IQuoteCargoDetails {
  weight: number | null
  volume: number | null
  palletCount: number | null
  fragility: 'fragile' | 'robust' | null
  dimensions: {
    length: number | null
    width: number | null
    height: number | null
  }
  options: {
    hazardous: boolean
    insuranceCoverage: boolean
    perishableGoods: boolean
  }
}

export interface ISelectedCategories {
  selectedCategories: string[]
}

export interface ISelectedServices {
  selectedServices: Array<{
    serviceId: string
    included: boolean
    price: number
  }>
}

export interface IQuoteTiming {
  fromDate: number
  toDate: number
  comment?: string
}

export interface IQuoteDocument {
  name: string
  size: number
  type: string
  url?: string
}

export interface IQuoteDocuments {
  documents: IQuoteDocument[]
  comment?: string
}

export interface IQuoteComments {
  comment: string
  additionalComment: string
}

export interface IQuoteService {
  id: string
  name: string
  price: number
  description?: string
  category?: string
  unit?: string
  quantity?: number
}

export interface IQuotePricing {
  vatRate: number
  totalHT: number
  totalTTC: number
  vatAmount: number
  services?: IQuoteService[]
  currency: string
  discountPercentage?: number
  discountAmount?: number
  notes?: string
}

export const quote = pgTable(
  'quote',
  {
    id: text('id').primaryKey(),
    quoteNumber: text('quote_number').unique().notNull(),

    requestId: text('request_id')
      .references(() => request.id, { onDelete: 'cascade' })
      .notNull(),
    organizationId: text('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    createdById: text('created_by_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),

    cargoTypes: json('cargo_types').$type<string[]>(),
    services:
      json('services').$type<Array<{ serviceId: string; included: boolean; price: number }>>(),
    cargoDetails: json('cargo_details').$type<IQuoteCargoDetails>(),
    timing: json('timing').$type<IQuoteTiming>(),
    documents: json('documents').$type<IQuoteDocuments>(),
    comments: json('comments').$type<IQuoteComments>(),

    pricing: json('pricing').$type<IQuotePricing>().notNull(),

    description: text('description'),
    terms: text('terms'),
    validUntil: timestamp('valid_until').notNull(),

    status: quoteStatusEnum('status').default('draft').notNull(),
    version: integer('version').default(1).notNull(),

    respondedAt: timestamp('responded_at'),
    respondedById: text('responded_by_id').references(() => user.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),

    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    requestCreatedIdx: index('idx_quote_request_created').on(
      table.requestId,
      table.createdAt.desc()
    ),
  })
)

export const quoteRelations = relations(quote, ({ one }) => ({
  request: one(request, {
    fields: [quote.requestId],
    references: [request.id],
  }),
  organization: one(organization, {
    fields: [quote.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [quote.createdById],
    references: [user.id],
    relationName: 'quote_created_by',
  }),
  respondedBy: one(user, {
    fields: [quote.respondedById],
    references: [user.id],
    relationName: 'quote_responded_by',
  }),
}))

export type Quote = typeof quote.$inferSelect
export type NewQuote = typeof quote.$inferInsert
export type User = typeof user.$inferSelect
export type Organization = typeof organization.$inferSelect
export type Request = typeof request.$inferSelect

export interface QuoteWithRelations extends Quote {
  request?: Request
  organization?: Organization
  createdBy?: User
  respondedBy?: User
}

export interface CreateQuoteData {
  requestId: string
  organizationId?: string
  selectedCategories: string[]
  selectedServices: Array<{ serviceId: string; included: boolean; price: number }>
  cargoDetails: IQuoteCargoDetails
  generalFeedback?: string
  description?: string
  vatRate: number
  totalHT: number
  totalTTC: number
  vatAmount: number
  validUntil?: Date
}

export interface UpdateQuoteData {
  cargoTypes?: string[]
  services?: Array<{ serviceId: string; included: boolean; price: number }>
  cargoDetails?: IQuoteCargoDetails
  timing?: IQuoteTiming
  documents?: IQuoteDocuments
  comments?: IQuoteComments
  pricing?: Partial<IQuotePricing>
  description?: string
  terms?: string
  validUntil?: Date
  status?: EQuoteStatus
  version?: number
  rejectionReason?: string
}

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export const EDITABLE_QUOTE_STATUSES = [EQuoteStatus.DRAFT]

export const SENDABLE_QUOTE_STATUSES = [EQuoteStatus.DRAFT]

export const RESPONDABLE_QUOTE_STATUSES = [EQuoteStatus.SENT]

export const canEditQuote = (status: EQuoteStatus): boolean => {
  return EDITABLE_QUOTE_STATUSES.includes(status)
}

export const canSendQuote = (quote: Pick<Quote, 'status' | 'validUntil' | 'services'>): boolean => {
  return (
    SENDABLE_QUOTE_STATUSES.includes(quote.status as EQuoteStatus) &&
    new Date(quote.validUntil) > new Date() &&
    quote.services != null &&
    Array.isArray(quote.services) &&
    (quote.services as Array<{ serviceId: string; included: boolean; price: number }>).length > 0
  )
}

export const canRespondToQuote = (quote: Pick<Quote, 'status' | 'validUntil'>): boolean => {
  return (
    RESPONDABLE_QUOTE_STATUSES.includes(quote.status as EQuoteStatus) &&
    new Date(quote.validUntil) > new Date()
  )
}
