import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { showRetryErrorToast, showSuccessToast, showUndoToast } from "@/shared/ui/toasts"
import { requestMutationResponseSchema } from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"
import {
    beginRequestAssignmentMutation,
    getRequestAssignmentUndoVariables,
    invalidateRequestAssignmentMutation,
    type RequestAssignmentMutationContext,
    rollbackRequestAssignmentMutation,
} from "./request-assignment.cache"
import type { RequestScopeKey } from "./requests.api"

export interface AssignRequestVariables {
    requestId: string
    memberId: string
    memberName?: string
    memberEmail?: string
    memberRole?: string
    memberImage?: string | null
    currentUserId?: string
}

type AssignSuccessData = {
    response: unknown
    memberName?: string
    memberId: string
    memberEmail?: string
    memberRole?: string
    memberImage?: string | null
    currentUserId?: string
}

export function useAssignRequest(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    const undoUnassign = useMutation({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/requests/${requestId}/assign`, {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })
            return parseJsonResponse(
                res,
                requestMutationResponseSchema,
                "Failed to undo assignment"
            )
        },
        onSettled: () => {
            invalidateRequestAssignmentMutation(queryClient, requestScope)
        },
    })

    const mutationRef = useRef<UseMutationResult<
        AssignSuccessData,
        Error,
        AssignRequestVariables,
        RequestAssignmentMutationContext
    > | null>(null)

    const mutation = useMutation<
        AssignSuccessData,
        Error,
        AssignRequestVariables,
        RequestAssignmentMutationContext
    >({
        mutationFn: async ({
            requestId,
            memberId,
            memberName,
            memberEmail,
            memberRole,
            memberImage,
            currentUserId,
        }) => {
            const res = await fetch(`/api/requests/${requestId}/assign`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ assignedToId: memberId }),
            })

            return {
                response: await parseJsonResponse(
                    res,
                    requestMutationResponseSchema,
                    "Failed to assign request"
                ),
                memberName,
                memberId,
                memberEmail,
                memberRole,
                memberImage,
                currentUserId,
            }
        },
        onMutate: async ({
            requestId,
            memberId,
            memberName,
            memberEmail,
            memberRole,
            memberImage,
        }) => {
            return beginRequestAssignmentMutation(queryClient, requestScope, requestId, {
                memberId,
                memberName,
                memberEmail,
                memberRole,
                memberImage,
            })
        },
        onSuccess: ({ memberName, memberId, currentUserId }, variables) => {
            const isAssigningToSelf = memberId === currentUserId
            const message = isAssigningToSelf
                ? "Request assigned to you"
                : memberName
                  ? `Request assigned to ${memberName}`
                  : "Request assigned"

            showUndoToast(message, {
                onUndo: () => undoUnassign.mutate(variables.requestId),
            })
        },
        onError: (error, variables, context) => {
            rollbackRequestAssignmentMutation(queryClient, context)
            showRetryErrorToast(error.message || "Failed to assign request", {
                onRetry: () => mutationRef.current?.mutate(variables),
            })
        },
        onSettled: () => {
            invalidateRequestAssignmentMutation(queryClient, requestScope)
        },
    })

    mutationRef.current = mutation
    return mutation
}

export function useReassignRequest(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    const undoReassign = useMutation({
        mutationFn: async ({ requestId, memberId }: { requestId: string; memberId: string }) => {
            const res = await fetch(`/api/requests/${requestId}/assign`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedToId: memberId }),
            })
            return parseJsonResponse(
                res,
                requestMutationResponseSchema,
                "Failed to undo reassignment"
            )
        },
        onSettled: () => {
            invalidateRequestAssignmentMutation(queryClient, requestScope)
        },
    })

    const mutationRef = useRef<UseMutationResult<
        AssignSuccessData,
        Error,
        AssignRequestVariables,
        RequestAssignmentMutationContext
    > | null>(null)

    const mutation = useMutation<
        AssignSuccessData,
        Error,
        AssignRequestVariables,
        RequestAssignmentMutationContext
    >({
        mutationFn: async ({
            requestId,
            memberId,
            memberName,
            memberEmail,
            memberRole,
            memberImage,
            currentUserId,
        }) => {
            const res = await fetch(`/api/requests/${requestId}/assign`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ assignedToId: memberId }),
            })

            return {
                response: await parseJsonResponse(
                    res,
                    requestMutationResponseSchema,
                    "Failed to reassign request"
                ),
                memberName,
                memberId,
                memberEmail,
                memberRole,
                memberImage,
                currentUserId,
            }
        },
        onMutate: async ({
            requestId,
            memberId,
            memberName,
            memberEmail,
            memberRole,
            memberImage,
        }) => {
            return beginRequestAssignmentMutation(queryClient, requestScope, requestId, {
                memberId,
                memberName,
                memberEmail,
                memberRole,
                memberImage,
            })
        },
        onSuccess: ({ memberName, memberId, currentUserId }, variables, context) => {
            const isAssigningToSelf = memberId === currentUserId
            const message = isAssigningToSelf
                ? "Request reassigned to you"
                : memberName
                  ? `Request reassigned to ${memberName}`
                  : "Request reassigned"

            const undoVariables = getRequestAssignmentUndoVariables(variables.requestId, context)
            if (!undoVariables) {
                showSuccessToast(message)
                return
            }

            showUndoToast(message, {
                onUndo: () => undoReassign.mutate(undoVariables),
            })
        },
        onError: (error, variables, context) => {
            rollbackRequestAssignmentMutation(queryClient, context)
            showRetryErrorToast(error.message || "Failed to reassign request", {
                onRetry: () => mutationRef.current?.mutate(variables),
            })
        },
        onSettled: () => {
            invalidateRequestAssignmentMutation(queryClient, requestScope)
        },
    })

    mutationRef.current = mutation
    return mutation
}

export function useUnassignRequest(requestScope: RequestScopeKey) {
    const queryClient = useQueryClient()

    const undoAssign = useMutation({
        mutationFn: async ({ requestId, memberId }: { requestId: string; memberId: string }) => {
            const res = await fetch(`/api/requests/${requestId}/assign`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedToId: memberId }),
            })
            return parseJsonResponse(
                res,
                requestMutationResponseSchema,
                "Failed to undo unassignment"
            )
        },
        onSettled: () => {
            invalidateRequestAssignmentMutation(queryClient, requestScope)
        },
    })

    const mutationRef = useRef<UseMutationResult<
        unknown,
        Error,
        string,
        RequestAssignmentMutationContext
    > | null>(null)

    const mutation = useMutation<unknown, Error, string, RequestAssignmentMutationContext>({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/requests/${requestId}/assign`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            return parseJsonResponse(
                res,
                requestMutationResponseSchema,
                "Failed to unassign request"
            )
        },
        onMutate: async (requestId: string) => {
            return beginRequestAssignmentMutation(queryClient, requestScope, requestId, null)
        },
        onSuccess: (_data, requestId, context) => {
            const undoVariables = getRequestAssignmentUndoVariables(requestId, context)
            if (!undoVariables) {
                showSuccessToast("Request unassigned")
                return
            }

            showUndoToast("Request unassigned", {
                onUndo: () => undoAssign.mutate(undoVariables),
            })
        },
        onError: (error, requestId, context) => {
            rollbackRequestAssignmentMutation(queryClient, context)
            showRetryErrorToast(error.message || "Failed to unassign request", {
                onRetry: () => mutationRef.current?.mutate(requestId),
            })
        },
        onSettled: () => {
            invalidateRequestAssignmentMutation(queryClient, requestScope)
        },
    })

    mutationRef.current = mutation
    return mutation
}
