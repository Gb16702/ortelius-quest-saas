import { useMutation, useQueryClient } from "@tanstack/react-query"
import { showErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { parseQuoteMutationResponse, type RejectQuotePayload } from "./use-quote"

export function useRejectQuote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ quoteId, reason }: RejectQuotePayload) => {
            const res = await fetch(`/api/quotes/${quoteId}/reject`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectionReason: reason }),
            })

            return parseQuoteMutationResponse(res, "Failed to reject quote")
        },
        onSuccess: (_data, _variables) => {
            showSuccessToast("Quote rejected")

            queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey[0]
                    return key === "quotes" || key === "quote" || key === "requests"
                },
            })
        },
        onError: (error: Error) => {
            showErrorToast(error.message || "Failed to reject quote. Please try again.")
        },
    })
}
