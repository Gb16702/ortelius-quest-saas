import type { QueryClient } from "@tanstack/react-query"
import { membersKeys } from "@/entities/member"
import {
    findPreviousAssignee,
    type PreviousAssigneeSnapshot,
    type PreviousQueriesSnapshot,
    setRequestsQueryData,
    updateRequestsQueryData,
} from "./request-mutation.cache"
import { type RequestScopeKey, requestsKeys } from "./requests.api"

export interface RequestAssignmentAssigneeInput {
    memberId: string
    memberName?: string
    memberEmail?: string
    memberRole?: string
    memberImage?: string | null
}

export interface RequestAssignmentMutationContext {
    previousData: PreviousQueriesSnapshot
    previousAssignee: PreviousAssigneeSnapshot | null
}

interface RequestAssignmentUndoVariables {
    requestId: string
    memberId: string
}

export async function beginRequestAssignmentMutation(
    queryClient: QueryClient,
    requestScope: RequestScopeKey,
    requestId: string,
    assignee: RequestAssignmentAssigneeInput | null
): Promise<RequestAssignmentMutationContext> {
    await queryClient.cancelQueries({ queryKey: requestsKeys.scope(requestScope) })

    const previousData = queryClient.getQueriesData({
        queryKey: requestsKeys.scope(requestScope),
    })
    const previousAssignee = findPreviousAssignee(previousData, requestId)

    setRequestsQueryData(queryClient, requestScope, (oldData) =>
        updateRequestsQueryData(oldData, (request) =>
            request.id === requestId
                ? {
                      ...request,
                      assignedTo: assignee
                          ? {
                                id: assignee.memberId,
                                name: assignee.memberName || "",
                                email: assignee.memberEmail || "",
                                role: assignee.memberRole || "",
                                image: assignee.memberImage || null,
                            }
                          : null,
                  }
                : request
        )
    )

    return { previousData, previousAssignee }
}

export function rollbackRequestAssignmentMutation(
    queryClient: QueryClient,
    context: RequestAssignmentMutationContext | undefined
) {
    if (!context?.previousData) return

    for (const [queryKey, data] of context.previousData) {
        queryClient.setQueryData(queryKey, data)
    }
}

export function getRequestAssignmentUndoVariables(
    requestId: string,
    context: RequestAssignmentMutationContext | undefined
): RequestAssignmentUndoVariables | null {
    const previousAssignee = context?.previousAssignee
    if (!previousAssignee) return null

    return {
        requestId,
        memberId: previousAssignee.memberId,
    }
}

export function invalidateRequestAssignmentMutation(
    queryClient: QueryClient,
    requestScope: RequestScopeKey
) {
    queryClient.invalidateQueries({ queryKey: requestsKeys.scope(requestScope) })
    queryClient.invalidateQueries({ queryKey: membersKeys.profiles() })
}
