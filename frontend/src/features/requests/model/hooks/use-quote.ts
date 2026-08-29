import { useQuery } from "@tanstack/react-query"
import type * as v from "valibot"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    getResponseErrorMessage,
    parseJsonResponse,
    readJsonResponse,
} from "../../api/request.response"
import { requestsKeys } from "../../api/requests.api"
import {
    quoteMutationResponseSchema,
    type quoteSchema,
    quotesResponseSchema,
} from "../schemas/request.schema"

export type QuoteStatus = v.InferOutput<typeof quoteSchema>["status"]

export interface QuoteService {
    id: string
    name: string
    price: number
    description?: string
    category?: string
    unit?: string
    quantity?: number
}

export interface QuoteServiceRef {
    serviceId: string
    included: boolean
    price: number
}

export interface QuoteCargoDetails {
    weight: number | null
    volume: number | null
    palletCount: number | null
    fragility: "fragile" | "robust" | null
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

export interface QuotePricing {
    vatRate: number
    totalHT: number
    totalTTC: number
    vatAmount: number
    services?: QuoteService[]
    currency: string
    discountPercentage?: number
    discountAmount?: number
    notes?: string
}

export interface QuoteLegalDocument {
    id: string
    label: string
    originalFilename: string
    sizeBytes: number
    downloadUrl: string
    downloadUrlExpiresAt: string
}

export type Quote = v.InferOutput<typeof quoteSchema>

export interface QuoteWithOrganization extends Quote {
    organization: {
        id: string
        name: string
        logo: string | null
    }
}

export interface AcceptQuotePayload {
    quoteId: string
}

export interface RejectQuotePayload {
    quoteId: string
    reason: string
}

export function useQuotesByRequest(requestId: string | undefined) {
    return useQuery({
        queryKey: requestsKeys.quotesByRequest(requestId),
        queryFn: async () => {
            if (!requestId) return []

            const res = await fetch(`/api/quotes/request/${requestId}`, {
                credentials: "include",
            })

            return parseJsonResponse(res, quotesResponseSchema, "Failed to fetch quotes").then(
                (json) => json.data
            )
        },
        enabled: !!requestId,
        staleTime: 1000 * 60 * 5,
    })
}

export async function parseQuoteMutationResponse(res: Response, fallback: string): Promise<void> {
    const json = await readJsonResponse(res)
    if (!res.ok) throw new Error(getResponseErrorMessage(json, fallback))
    parseSchema(quoteMutationResponseSchema, json)
}
