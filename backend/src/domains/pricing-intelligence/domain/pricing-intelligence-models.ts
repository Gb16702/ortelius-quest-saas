export interface ImportBatchError {
  row: number
  message: string
}

export interface ImportBatchRecord {
  id: string
  organizationId: string
  fileName: string
  rowCount: number
  errorCount: number
  errors: ImportBatchError[] | null
  uploadedById: string
  createdAt: Date
}

export interface ImportResult {
  batchId: string
  fileName: string
  rowCount: number
  errorCount: number
  errors: ImportBatchError[]
}

export interface PriceSuggestion {
  serviceId: string
  serviceName: string
  suggestedPrice: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  stats: ServiceStats
}

export interface ServiceStats {
  transactionCount: number
  avgPrice: number
  minPrice: number
  maxPrice: number
}

export type TierName = 'exact' | 'flags' | 'partial' | 'global'

export interface TieredStats {
  tier: TierName
  count: number
  avg: number
  min: number
  max: number
  stddev: number
  weightSlope: number | null
  weightIntercept: number | null
  weightCorr: number | null
  volumeSlope: number | null
  volumeIntercept: number | null
  volumeCorr: number | null
}

export interface SuggestPricingRequest {
  serviceIds: string[]
  cargoCategories: string[]
  cargoWeight: number | null
  cargoVolume: number | null
  cargoIsHazardous: boolean
  cargoIsReefer: boolean
  cargoIsOversized: boolean
}

export interface PricingIntelligenceStats {
  totalTransactions: number
  totalImports: number
  services: Array<{
    serviceId: string
    serviceName: string
    transactionCount: number
    avgPrice: number | null
  }>
}

export interface ServiceReference {
  id: string
  name: string
}

export interface CategoryReference {
  id: string
  name: string
}

export interface HistoricalTransactionInput {
  id: string
  organizationId: string
  serviceId: string
  price: number
  currency: string
  cargoCategories: string[]
  cargoWeight: number | null
  cargoVolume: number | null
  cargoIsHazardous: 0 | 1
  cargoIsReefer: 0 | 1
  cargoIsOversized: 0 | 1
  source: 'csv_import' | 'accepted_quote'
  importBatchId: string | null
  quoteId: string | null
  transactionDate: Date
  createdAt: Date
}
