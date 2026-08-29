import { useQuery } from "@tanstack/react-query"
import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"

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

export interface SuggestPricingContext {
    serviceIds: string[]
    cargoCategories: string[]
    cargoWeight: number | null
    cargoVolume: number | null
    cargoIsHazardous: boolean
    cargoIsReefer: boolean
    cargoIsOversized: boolean
}

export interface PriceSuggestionsQueryResult {
    requestId: string
    context: SuggestPricingContext
    suggestions: PriceSuggestion[]
}

interface FetchPriceSuggestionsOptions {
    signal?: AbortSignal
}

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

const pricingSuggestionsApiResponseSchema = v.looseObject({
    success: v.boolean(),
    data: v.optional(v.unknown()),
    message: v.optional(v.string()),
})

function unwrapPricingSuggestionsData(payload: unknown): unknown {
    const parsed = v.parse(pricingSuggestionsApiResponseSchema, payload)
    if (!parsed.success) {
        throw new Error(parsed.message || "Failed to fetch price suggestions")
    }
    return parsed.output
}

export const pricingSuggestionsKeys = {
    all: ["pricing-suggestions"] as const,
    suggest: (
        requestId: string | null | undefined,
        context: SuggestPricingContext | null | undefined
    ) => [...pricingSuggestionsKeys.all, "suggest", requestId ?? null, context ?? null] as const,
}

export function getPricingSuggestionsApplicationKey(
    requestId: string,
    context: SuggestPricingContext
): string {
    return JSON.stringify(pricingSuggestionsKeys.suggest(requestId, context))
}

export async function fetchPriceSuggestions(
    context: SuggestPricingContext,
    options: FetchPriceSuggestionsOptions = {}
): Promise<PriceSuggestion[]> {
    const response = await fetch("/api/pricing-intelligence/suggest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: options.signal,
        body: JSON.stringify(context),
    })

    const payload = await readJsonResponse(response)

    if (!response.ok) {
        const result = v.safeParse(pricingSuggestionsApiResponseSchema, payload)
        throw new Error(
            result.success
                ? result.output.message || "Failed to fetch price suggestions"
                : "Failed to fetch price suggestions"
        )
    }

    return v.parse(v.array(priceSuggestionSchema), unwrapPricingSuggestionsData(payload) ?? [])
}

export function usePriceSuggestions(
    requestId: string | null | undefined,
    context: SuggestPricingContext | null,
    options?: { enabled?: boolean }
) {
    return useQuery<PriceSuggestionsQueryResult>({
        queryKey: pricingSuggestionsKeys.suggest(requestId, context),
        queryFn: async ({ signal }) => {
            if (!requestId || !context) {
                throw new Error("requestId and pricing context are required")
            }

            return {
                requestId,
                context,
                suggestions: await fetchPriceSuggestions(context, { signal }),
            }
        },
        enabled: (options?.enabled ?? true) && !!requestId && !!context,
        retry: false,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}
