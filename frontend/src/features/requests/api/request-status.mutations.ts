import { useMutation, useQueryClient } from "@tanstack/react-query"
import { requestMutationResponseSchema } from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"
import { setRequestsQueryData, updateRequestsQueryData } from "./request-mutation.cache"
import { type RequestScopeKey, requestsKeys } from "./requests.api"

export function useCancelRequest(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/requests/${requestId}/cancel`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            return parseJsonResponse(res, requestMutationResponseSchema, "Failed to cancel request")
        },
        onMutate: async (requestId) => {
            await queryClient.cancelQueries({ queryKey: requestsKeys.scope(requestScope) })

            const previousData = queryClient.getQueriesData({
                queryKey: requestsKeys.scope(requestScope),
            })

            setRequestsQueryData(queryClient, requestScope, (oldData) => {
                const updatedAt = new Date().toISOString()
                return updateRequestsQueryData(oldData, (request) =>
                    request.id === requestId
                        ? {
                              ...request,
                              lifecycleStatus: "closed" as const,
                              closedReason: "cancelled" as const,
                              updatedAt,
                          }
                        : request
                )
            })

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

interface RejectRequestParams {
    requestId: string
    reason: string
}

export function useRejectRequest(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ requestId, reason }: RejectRequestParams) => {
            const res = await fetch(`/api/requests/${requestId}/reject`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason }),
            })

            return parseJsonResponse(res, requestMutationResponseSchema, "Failed to reject request")
        },
        onMutate: async ({ requestId }) => {
            await queryClient.cancelQueries({ queryKey: requestsKeys.scope(requestScope) })

            const previousData = queryClient.getQueriesData({
                queryKey: requestsKeys.scope(requestScope),
            })

            setRequestsQueryData(queryClient, requestScope, (oldData) => {
                const updatedAt = new Date().toISOString()
                return updateRequestsQueryData(oldData, (request) =>
                    request.id === requestId
                        ? {
                              ...request,
                              lifecycleStatus: "closed" as const,
                              closedReason: "request_rejected" as const,
                              updatedAt,
                          }
                        : request
                )
            })

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

export function useValidateDraft(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/requests/${requestId}/validate`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            return parseJsonResponse(res, requestMutationResponseSchema, "Failed to validate draft")
        },
        onMutate: async (requestId) => {
            await queryClient.cancelQueries({ queryKey: requestsKeys.scope(requestScope) })

            const previousData = queryClient.getQueriesData({
                queryKey: requestsKeys.scope(requestScope),
            })

            setRequestsQueryData(queryClient, requestScope, (oldData) => {
                const updatedAt = new Date().toISOString()
                return updateRequestsQueryData(oldData, (request) =>
                    request.id === requestId
                        ? {
                              ...request,
                              lifecycleStatus: "open" as const,
                              closedReason: null,
                              updatedAt,
                          }
                        : request
                )
            })

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
