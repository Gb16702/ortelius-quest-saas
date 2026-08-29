import * as v from "valibot"

export const importResultSchema = v.object({
    batchId: v.string(),
    fileName: v.string(),
    rowCount: v.number(),
    errorCount: v.number(),
    errors: v.array(
        v.object({
            row: v.number(),
            message: v.string(),
        })
    ),
})

export const importBatchSchema = v.object({
    id: v.string(),
    organizationId: v.string(),
    fileName: v.string(),
    rowCount: v.number(),
    errorCount: v.number(),
    errors: v.nullable(v.array(v.object({ row: v.number(), message: v.string() }))),
    uploadedById: v.string(),
    createdAt: v.string(),
})

export const pricingStatsSchema = v.object({
    totalTransactions: v.number(),
    totalImports: v.number(),
    services: v.array(
        v.object({
            serviceId: v.string(),
            serviceName: v.string(),
            transactionCount: v.number(),
            avgPrice: v.nullable(v.number()),
        })
    ),
})

export const priceSuggestionSchema = v.object({
    serviceId: v.string(),
    serviceName: v.string(),
    suggestedPrice: v.number(),
    confidence: v.picklist(["high", "medium", "low"]),
    reasoning: v.string(),
    stats: v.object({
        transactionCount: v.number(),
        avgPrice: v.number(),
        minPrice: v.number(),
        maxPrice: v.number(),
    }),
})

export const pricingIntelligenceApiResponseSchema = v.looseObject({
    success: v.boolean(),
    data: v.optional(v.unknown()),
    message: v.optional(v.string()),
})

export function getPricingIntelligenceErrorMessage(payload: unknown, fallback: string): string {
    const result = v.safeParse(pricingIntelligenceApiResponseSchema, payload)
    if (!result.success) return fallback
    return result.output.message || fallback
}

export function parsePricingIntelligenceApiData(payload: unknown, fallback: string): unknown {
    const result = v.safeParse(pricingIntelligenceApiResponseSchema, payload)
    if (!result.success || !result.output.success) {
        throw new Error(getPricingIntelligenceErrorMessage(payload, fallback))
    }
    return result.output.data
}
