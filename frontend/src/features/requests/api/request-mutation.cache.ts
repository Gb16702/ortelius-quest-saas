import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { AssignedUser, RequestData, RequestsListData, UserRequest } from "../model/request"
import { requestDetailSchema, requestsListDataSchema } from "../model/schemas/request.schema"
import { type RequestScopeKey, requestsKeys } from "./requests.api"

function isRequestsListData(data: unknown): data is RequestsListData {
    return safeParseSchema(requestsListDataSchema, data).success
}

function isRequestDetailData(data: unknown): data is RequestData {
    return safeParseSchema(requestDetailSchema, data).success
}

type RequestQueryData = RequestData | UserRequest

export function updateRequestsQueryData(
    oldData: unknown,
    updateRequest: (request: RequestQueryData) => RequestQueryData
): unknown {
    if (isRequestsListData(oldData)) {
        return {
            ...oldData,
            requests: oldData.requests.map(updateRequest),
        }
    }

    if (isRequestDetailData(oldData)) {
        return updateRequest(oldData)
    }

    return oldData
}

export function removeRequestFromRequestsQueryData(oldData: unknown, requestId: string): unknown {
    if (!isRequestsListData(oldData)) return oldData

    return {
        ...oldData,
        requests: oldData.requests.filter((request) => request.id !== requestId),
    }
}

export function setRequestsQueryData(
    queryClient: QueryClient,
    requestScope: RequestScopeKey,
    updateData: (oldData: unknown) => unknown
) {
    queryClient.setQueriesData({ queryKey: requestsKeys.scope(requestScope) }, updateData)
}

export interface PreviousAssigneeSnapshot {
    memberId: string
    memberName: string
    memberEmail: string
    memberRole: string
    memberImage: string | null
}

const toAssigneeSnapshot = (assignedTo: AssignedUser): PreviousAssigneeSnapshot => ({
    memberId: assignedTo.id,
    memberName: assignedTo.name,
    memberEmail: assignedTo.email,
    memberRole: assignedTo.role,
    memberImage: assignedTo.image,
})

export type PreviousQueriesSnapshot = ReadonlyArray<[QueryKey, unknown]>

export const findPreviousAssignee = (
    previousData: PreviousQueriesSnapshot,
    requestId: string
): PreviousAssigneeSnapshot | null => {
    for (const [, data] of previousData) {
        if (isRequestsListData(data)) {
            const request = data.requests.find((r) => r.id === requestId)
            if (request?.assignedTo) return toAssigneeSnapshot(request.assignedTo)
            continue
        }

        if (isRequestDetailData(data) && data.id === requestId && data.assignedTo) {
            return toAssigneeSnapshot(data.assignedTo)
        }
    }
    return null
}
