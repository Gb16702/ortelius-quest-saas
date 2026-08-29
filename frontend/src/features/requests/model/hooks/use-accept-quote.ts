import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { type AcceptQuotePayload, parseQuoteMutationResponse } from "./use-quote"

export function useAcceptQuote() {
    const queryClient = useQueryClient()

    const mutationRef = useRef<UseMutationResult<unknown, Error, AcceptQuotePayload> | null>(null)

    const mutation = useMutation<unknown, Error, AcceptQuotePayload>({
        mutationFn: async ({ quoteId }: AcceptQuotePayload) => {
            const res = await fetch(`/api/quotes/${quoteId}/accept`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })

            return parseQuoteMutationResponse(res, "Failed to accept quote")
        },
        onSuccess: () => {
            showSuccessToast("Quote accepted")

            queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey[0]
                    return (
                        key === "quotes" ||
                        key === "quote" ||
                        key === "requests" ||
                        key === "invoices"
                    )
                },
            })
        },
        onError: (error, variables) => {
            showRetryErrorToast(error.message || "Failed to accept quote", {
                onRetry: () => mutationRef.current?.mutate(variables),
            })
        },
    })

    mutationRef.current = mutation
    return mutation
}
