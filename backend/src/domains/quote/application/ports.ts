export type QuoteSelectedService = {
  serviceId: string
  included: boolean
  price: number
}

export type QuoteCargoDetails = {
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

export type QuotePricingUpdate = {
  vatRate?: number
  totalHT?: number
  totalTTC?: number
  vatAmount?: number
  currency?: string
  discountPercentage?: number
  notes?: string
}

export type QuoteCreateData = {
  requestId: string
  organizationId?: string
  selectedCategories: string[]
  selectedServices: QuoteSelectedService[]
  cargoDetails: QuoteCargoDetails
  vatRate: number
  totalHT: number
  totalTTC: number
  vatAmount: number
  description?: string
  validUntil?: Date
  legalDocumentIds?: string[]
}

export type QuoteUpdateData = {
  selectedCategories?: string[]
  selectedServices?: QuoteSelectedService[]
  cargoDetails?: QuoteCargoDetails
  description?: string
  validUntil?: Date
  pricing?: QuotePricingUpdate
}

export type QuoteRecord = {
  id: string
  requestId: string
  organizationId?: string | null
  quoteNumber?: string
  createdById?: string
  pricing?: unknown
  [key: string]: unknown
}

export type QuoteLegalDocumentSnapshot = {
  id: string
  label: string
  originalFilename: string
  sizeBytes: number
  s3Key: string
}

export type QuoteLegalDocumentDownload = {
  id: string
  label: string
  originalFilename: string
  sizeBytes: number
  downloadUrl: string
  downloadUrlExpiresAt: string
}

export type QuoteLegalDocumentsList = QuoteLegalDocumentDownload[]

export type QuoteRequestSummary = {
  id: string
  reqNumber?: string | null
}

export type QuoteActivityEventType =
  | 'quote-created'
  | 'quote-updated'
  | 'quote-accepted'
  | 'quote-rejected'

export interface QuoteRepositoryPort {
  createAndSendQuote(
    data: QuoteCreateData,
    createdById: string,
    legalDocuments: QuoteLegalDocumentSnapshot[]
  ): Promise<QuoteRecord>
  getQuoteById(quoteId: string): Promise<QuoteRecord>
  updateQuote(quoteId: string, updates: QuoteUpdateData): Promise<QuoteRecord>
  acceptQuote(quoteId: string, userId: string): Promise<QuoteRecord>
  rejectQuote(quoteId: string, rejectionReason: string, userId: string): Promise<QuoteRecord>
  getQuotesByRequest(requestId: string): Promise<QuoteRecord[]>
  getOrganizationQuotes(organizationId: string, userId: string): Promise<QuoteRecord[]>
  getLegalDocumentsForQuote(quoteId: string): Promise<QuoteLegalDocumentsList>
  getLegalDocumentsForQuotes(quoteIds: string[]): Promise<Map<string, QuoteLegalDocumentsList>>
}

export interface QuotePermissionPort {
  canCreateQuote(requestId: string, userId: string): Promise<boolean>
}

export type QuoteAccessDecision = 'allowed' | 'not_found' | 'forbidden'

export interface QuoteAuthorizationPort {
  resolveQuoteAccess(quoteId: string, userId: string): Promise<QuoteAccessDecision>
  resolveRequestAccess(requestId: string, userId: string): Promise<QuoteAccessDecision>
}

export interface QuoteOrganizationResolverPort {
  resolveOrganizationIdForUser(userId: string): Promise<string | null>
}

export interface QuoteLegalDocumentPort {
  getActiveByIdsForOrg(
    documentIds: string[],
    organizationId: string
  ): Promise<QuoteLegalDocumentSnapshot[]>
}

export interface QuoteRequestQueryPort {
  getRequestById(requestId: string): Promise<QuoteRequestSummary | null>
}

export interface QuoteActivityPort {
  logQuoteEvent(data: {
    organizationId: string
    actorId: string
    eventType: QuoteActivityEventType
    quoteId: string
    requestId: string
    reqNumber?: string | null
  }): Promise<void>
}

export interface QuoteLifecycleSideEffectsPort {
  afterQuoteSent(data: { quote: QuoteRecord; actorId: string; totalTTC?: number }): Promise<void>
  afterQuoteAccepted(data: { quote: QuoteRecord; actorId: string }): Promise<void>
  afterQuoteRejected(data: {
    quote: QuoteRecord
    actorId: string
    rejectionReason: string
  }): Promise<void>
}
