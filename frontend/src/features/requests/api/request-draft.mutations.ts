import { useMutation, useQueryClient } from "@tanstack/react-query"
import { requestMutationResponseSchema } from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"
import { removeRequestFromRequestsQueryData, setRequestsQueryData } from "./request-mutation.cache"
import { type RequestScopeKey, requestsKeys } from "./requests.api"

export function useDeleteDraft(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/requests/${requestId}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            return parseJsonResponse(res, requestMutationResponseSchema, "Failed to delete draft")
        },
        onMutate: async (requestId) => {
            await queryClient.cancelQueries({ queryKey: requestsKeys.scope(requestScope) })

            const previousData = queryClient.getQueriesData({
                queryKey: requestsKeys.scope(requestScope),
            })

            setRequestsQueryData(queryClient, requestScope, (oldData) =>
                removeRequestFromRequestsQueryData(oldData, requestId)
            )

            return { previousData }
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                for (const [queryKey, data] of context.previousData) {
                    queryClient.setQueryData(queryKey, data)
                }
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: requestsKeys.scope(requestScope) })
        },
    })
}
