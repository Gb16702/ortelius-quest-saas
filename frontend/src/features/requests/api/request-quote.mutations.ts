import { useMutation, useQueryClient } from "@tanstack/react-query"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { showErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import type { QuoteData } from "../model/request"
import { createQuotePayloadSchema } from "../model/schemas/create-quote.schema"
import { requestMutationResponseSchema } from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"
import { type RequestScopeKey, requestsKeys } from "./requests.api"

export function buildCreateQuotePayload(requestId: string, quoteData: QuoteData) {
    return parseSchema(createQuotePayloadSchema, {
        requestId,
        selectedCategories: quoteData.selectedCategories,
        selectedServices: quoteData.selectedServices,
        cargoDetails: quoteData.cargoDetails,
        vatRate: quoteData.vatRate,
        totalHT: quoteData.totalHT,
        totalTTC: quoteData.totalTTC,
        vatAmount: quoteData.vatAmount,
        description: quoteData.description,
        legalDocumentIds: quoteData.legalDocumentIds,
    })
}

export function useSubmitQuote(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            requestId,
            quoteData,
        }: {
            requestId: string
            quoteData: QuoteData
        }) => {
            const payload = buildCreateQuotePayload(requestId, quoteData)

            const res = await fetch(`/api/quotes`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            return parseJsonResponse(res, requestMutationResponseSchema, "Failed to submit quote")
        },
        onSuccess: () => {
            showSuccessToast("Quote submitted")
            queryClient.invalidateQueries({ queryKey: requestsKeys.scope(requestScope) })
        },
        onError: (error: Error) => {
            showErrorToast(error.message || "Failed to submit quote")
        },
    })
}
