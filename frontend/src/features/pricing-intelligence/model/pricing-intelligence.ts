export interface ImportBatchError {
    row: number
    message: string
}

export interface ImportBatch {
    id: string
    organizationId: string
    fileName: string
    rowCount: number
    errorCount: number
    errors: ImportBatchError[] | null
    uploadedById: string
    createdAt: string
}

export interface ImportResult {
    batchId: string
    fileName: string
    rowCount: number
    errorCount: number
    errors: ImportBatchError[]
}

export interface ServiceStats {
    transactionCount: number
    avgPrice: number
    minPrice: number
    maxPrice: number
}

export interface PriceSuggestion {
    serviceId: string
    serviceName: string
    suggestedPrice: number
    confidence: "high" | "medium" | "low"
    reasoning: string
    stats: ServiceStats
}

export interface ServiceCoverage {
    serviceId: string
    serviceName: string
    transactionCount: number
    avgPrice: number | null
}

export interface PricingIntelligenceStats {
    totalTransactions: number
    totalImports: number
    services: ServiceCoverage[]
}
