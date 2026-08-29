import { useCallback } from "react"
import {
    useAssignRequest,
    useReassignRequest,
    useUnassignRequest,
} from "../../api/request-assignment.mutations"
import type { RequestScopeKey } from "../../api/requests.api"
import { getRequestActionPolicy } from "../../lib/request-action-policy"
import type { AssignDialogMember } from "../../lib/request-assignment"
import type { UserRequest } from "../request"

interface UseRequestsMutationActionsOptions {
    requestScope: RequestScopeKey
    selectedRequestForAssignment: UserRequest | null
    members: AssignDialogMember[]
    currentUserId: string
    currentUserRole: string | null
    closeAssignDialog: () => void
}

interface UseRequestsMutationActionsResult {
    assignMember: (memberId: string) => Promise<void>
    unassignMember: () => Promise<void>
    isAssigning: boolean
}

export function useRequestsMutationActions({
    requestScope,
    selectedRequestForAssignment,
    members,
    currentUserId,
    currentUserRole,
    closeAssignDialog,
}: UseRequestsMutationActionsOptions): UseRequestsMutationActionsResult {
    const assignRequestMutation = useAssignRequest(requestScope)
    const reassignRequestMutation = useReassignRequest(requestScope)
    const unassignRequestMutation = useUnassignRequest(requestScope)

    const assignMember = useCallback(
        async (memberId: string) => {
            if (!selectedRequestForAssignment) return
            const policy = getRequestActionPolicy({
                scope: requestScope.scope,
                currentUserRole,
                currentUserId,
                assignedToId: selectedRequestForAssignment.assignedTo?.id ?? null,
                lifecycleStatus: selectedRequestForAssignment.lifecycleStatus,
            })

            if (!policy.canAssignRequest) return

            const isReassigning = !!selectedRequestForAssignment.assignedTo
            const mutation = isReassigning ? reassignRequestMutation : assignRequestMutation
            const selectedMember = members.find((member) => member.id === memberId)

            mutation.mutate(
                {
                    requestId: selectedRequestForAssignment.id,
                    memberId,
                    memberName: selectedMember?.name,
                    memberEmail: selectedMember?.email,
                    memberRole: selectedMember?.role,
                    memberImage: selectedMember?.image,
                    currentUserId,
                },
                {
                    onSuccess: closeAssignDialog,
                }
            )
        },
        [
            selectedRequestForAssignment,
            members,
            currentUserId,
            currentUserRole,
            requestScope.scope,
            assignRequestMutation,
            reassignRequestMutation,
            closeAssignDialog,
        ]
    )

    const unassignMember = useCallback(async () => {
        if (!selectedRequestForAssignment) return
        const policy = getRequestActionPolicy({
            scope: requestScope.scope,
            currentUserRole,
            currentUserId,
            assignedToId: selectedRequestForAssignment.assignedTo?.id ?? null,
            lifecycleStatus: selectedRequestForAssignment.lifecycleStatus,
        })

        if (!policy.canAssignRequest) return

        unassignRequestMutation.mutate(selectedRequestForAssignment.id, {
            onSuccess: closeAssignDialog,
        })
    }, [
        selectedRequestForAssignment,
        requestScope.scope,
        currentUserRole,
        currentUserId,
        unassignRequestMutation,
        closeAssignDialog,
    ])

    return {
        assignMember,
        unassignMember,
        isAssigning:
            assignRequestMutation.isPending ||
            reassignRequestMutation.isPending ||
            unassignRequestMutation.isPending,
    }
}
