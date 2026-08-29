import { useQuery } from "@tanstack/react-query"
import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import type {
    ImportBatch,
    PriceSuggestion,
    PricingIntelligenceStats,
} from "../model/pricing-intelligence"
import {
    getPricingIntelligenceErrorMessage,
    importBatchSchema,
    parsePricingIntelligenceApiData,
    priceSuggestionSchema,
    pricingStatsSchema,
} from "../model/schemas/pricing-intelligence.schema"
import { pricingIntelligenceKeys } from "./pricing-intelligence.query-keys"

export function usePricingIntelligenceStats(organizationId: string | null) {
    return useQuery({
        queryKey: pricingIntelligenceKeys.stats(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchPricingStats(organizationId)
        },
        enabled: !!organizationId,
    })
}

export function useImportBatches(organizationId: string | null) {
    return useQuery({
        queryKey: pricingIntelligenceKeys.imports(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchImportBatches(organizationId)
        },
        enabled: !!organizationId,
    })
}

async function fetchPricingStats(_organizationId: string): Promise<PricingIntelligenceStats> {
    const response = await fetch(`/api/pricing-intelligence/stats`, {
        credentials: "include",
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(
            getPricingIntelligenceErrorMessage(payload, "Failed to fetch pricing stats")
        )
    }

    return parseSchema(
        pricingStatsSchema,
        parsePricingIntelligenceApiData(payload, "Failed to fetch pricing stats")
    )
}

async function fetchImportBatches(_organizationId: string): Promise<ImportBatch[]> {
    const response = await fetch(`/api/pricing-intelligence/imports`, { credentials: "include" })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(
            getPricingIntelligenceErrorMessage(payload, "Failed to fetch import batches")
        )
    }

    return v.parse(
        v.array(importBatchSchema),
        parsePricingIntelligenceApiData(payload, "Failed to fetch import batches") ?? []
    )
}

export interface SuggestPricingContext {
    serviceIds: string[]
    cargoCategories: string[]
    cargoWeight: number | null
    cargoVolume: number | null
    cargoIsHazardous: boolean
    cargoIsReefer: boolean
    cargoIsOversized: boolean
}

export async function fetchPriceSuggestions(
    context: SuggestPricingContext
): Promise<PriceSuggestion[]> {
    const response = await fetch(`/api/pricing-intelligence/suggest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(
            getPricingIntelligenceErrorMessage(payload, "Failed to fetch price suggestions")
        )
    }

    return v.parse(
        v.array(priceSuggestionSchema),
        parsePricingIntelligenceApiData(payload, "Failed to fetch price suggestions") ?? []
    )
}
