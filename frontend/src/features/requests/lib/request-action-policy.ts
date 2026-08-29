import { canManageRequests, parseRole } from "@/entities/access"
import type { RequestLifecycleStatus } from "../model/request"

export type RequestActionScope = "organization" | "personal"

export interface RequestActionPolicyInput {
    scope: RequestActionScope
    currentUserRole?: string | null
    currentUserId?: string | null
    assignedToId?: string | null
    lifecycleStatus: RequestLifecycleStatus
}

export interface RequestActionPolicy {
    canManageRequest: boolean
    canAssignRequest: boolean
    canShowAssignmentSummary: boolean
}

const NON_ASSIGNABLE_STATUSES = new Set<RequestLifecycleStatus>(["invoiced", "closed"])

export function isRequestAssignmentStatus(lifecycleStatus: RequestLifecycleStatus): boolean {
    return !NON_ASSIGNABLE_STATUSES.has(lifecycleStatus)
}

export function getRequestActionPolicy({
    scope,
    currentUserRole,
    currentUserId,
    lifecycleStatus,
}: RequestActionPolicyInput): RequestActionPolicy {
    const isOrganizationScope = scope === "organization"
    const parsedRole = parseRole(currentUserRole)
    const hasUser = Boolean(currentUserId)
    const canManageRequest =
        isOrganizationScope && hasUser && parsedRole !== null && canManageRequests()
    const isAssignmentStatus = isRequestAssignmentStatus(lifecycleStatus)

    return {
        canManageRequest,
        canAssignRequest: canManageRequest && isAssignmentStatus,
        canShowAssignmentSummary: isOrganizationScope && isAssignmentStatus,
    }
}
