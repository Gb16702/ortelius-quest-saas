import { useCallback, useMemo, useState } from "react"
import { useRequestAssignableMembers } from "../../api/request-member-lookup.query"
import type { RequestScopeKey } from "../../api/requests.api"
import { getRequestActionPolicy } from "../../lib/request-action-policy"
import { type AssignDialogMember, toAssignDialogMembers } from "../../lib/request-assignment"
import type { UserRequest } from "../request"
import { useRequestsMutationActions } from "./use-requests-mutation-actions"

interface UseRequestAssignmentDialogOptions {
    organizationId: string
    requestScope: RequestScopeKey
    currentUserId: string
    currentUserRole: string | null
}

interface RequestAssignmentDialogState {
    isOpen: boolean
    selectedRequest: UserRequest | null
    members: AssignDialogMember[]
    isLoadingMembers: boolean
    isAssigning: boolean
}

interface RequestAssignmentDialogActions {
    openAssignDialog: (request: UserRequest) => void
    closeAssignDialog: () => void
    assignMember: (memberId: string) => Promise<void>
    unassignMember: () => Promise<void>
}

export function useRequestAssignmentDialog({
    organizationId,
    requestScope,
    currentUserId,
    currentUserRole,
}: UseRequestAssignmentDialogOptions): {
    state: RequestAssignmentDialogState
    actions: RequestAssignmentDialogActions
} {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null)

    const membersQuery = useRequestAssignableMembers(organizationId, {
        enabled: !!organizationId && isOpen,
    })

    const members = useMemo(() => toAssignDialogMembers(membersQuery.data), [membersQuery.data])

    const openAssignDialog = useCallback(
        (request: UserRequest) => {
            const policy = getRequestActionPolicy({
                scope: requestScope.scope,
                currentUserRole,
                currentUserId,
                assignedToId: request.assignedTo?.id ?? null,
                lifecycleStatus: request.lifecycleStatus,
            })

            if (!policy.canAssignRequest) return

            setSelectedRequest(request)
            setIsOpen(true)
        },
        [currentUserId, currentUserRole, requestScope.scope]
    )

    const closeAssignDialog = useCallback(() => {
        setIsOpen(false)
        setSelectedRequest(null)
    }, [])

    const { assignMember, unassignMember, isAssigning } = useRequestsMutationActions({
        requestScope,
        selectedRequestForAssignment: selectedRequest,
        members,
        currentUserId,
        currentUserRole,
        closeAssignDialog,
    })

    return {
        state: {
            isOpen,
            selectedRequest,
            members,
            isLoadingMembers: membersQuery.isLoading,
            isAssigning,
        },
        actions: {
            openAssignDialog,
            closeAssignDialog,
            assignMember,
            unassignMember,
        },
    }
}
