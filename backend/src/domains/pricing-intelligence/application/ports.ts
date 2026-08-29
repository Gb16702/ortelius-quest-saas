import type {
  CategoryReference,
  HistoricalTransactionInput,
  ImportBatchError,
  ImportBatchRecord,
  PricingIntelligenceStats,
  ServiceReference,
  SuggestPricingRequest,
  TieredStats,
} from './pricing-intelligence-models'

export interface PricingCatalogPort {
  listOrganizationServices(organizationId: string): Promise<ServiceReference[]>
  listOrganizationCategories(organizationId: string): Promise<CategoryReference[]>
  listServicesByIds(serviceIds: string[]): Promise<ServiceReference[]>
}

export interface PricingIntelligenceRepositoryPort {
  createImportBatch(input: {
    id: string
    organizationId: string
    fileName: string
    rowCount: number
    errorCount: number
    errors: ImportBatchError[]
    uploadedById: string
    createdAt: Date
  }): Promise<void>
  deleteImportBatch(batchId: string, organizationId: string): Promise<void>
  findImportBatch(batchId: string, organizationId: string): Promise<ImportBatchRecord | null>
  getContextualStats(
    organizationId: string,
    serviceId: string,
    context: SuggestPricingRequest
  ): Promise<TieredStats[]>
  getStats(organizationId: string): Promise<PricingIntelligenceStats>
  insertHistoricalTransactions(transactions: HistoricalTransactionInput[]): Promise<void>
  listImportBatches(organizationId: string): Promise<ImportBatchRecord[]>
}

export interface AcceptedQuoteTransactionPort {
  loadAcceptedQuoteTransactions(
    quoteId: string,
    organizationId: string
  ): Promise<Omit<HistoricalTransactionInput, 'id' | 'createdAt'>[]>
}

export interface OrganizationMembershipPort {
  findOrganizationIdForUser(userId: string): Promise<string | null>
}

export interface IdGeneratorPort {
  generate(): string
}
