import type { RowSelectionState } from "@tanstack/react-table"
import { type Dispatch, type SetStateAction, useCallback } from "react"
import type { Invitation } from "@/entities/invitation"
import { showRetryErrorToast, showUndoToast } from "@/shared/ui/toasts"
import type {
    useArchiveInvitation,
    useBulkArchiveInvitations,
    useBulkUnarchiveInvitations,
    useUnarchiveInvitation,
} from "../../api/member-invitation-archive.mutations"
import type { MemberMutationResponse } from "../../api/member-mutation.response"
import { getSelectedRowIds } from "./get-selected-row-ids"

type ArchiveInvitationMutation = ReturnType<typeof useArchiveInvitation>
type UnarchiveInvitationMutation = ReturnType<typeof useUnarchiveInvitation>
type BulkArchiveMutation = ReturnType<typeof useBulkArchiveInvitations>
type BulkUnarchiveMutation = ReturnType<typeof useBulkUnarchiveInvitations>

interface UseInvitationUnarchiveActionOptions {
    rowSelection: RowSelectionState
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
    archiveInvitationMutation: ArchiveInvitationMutation
    unarchiveInvitationMutation: UnarchiveInvitationMutation
    bulkArchiveMutation: BulkArchiveMutation
    bulkUnarchiveMutation: BulkUnarchiveMutation
}

interface UseInvitationUnarchiveActionResult {
    unarchiveInvitation: (invitation: Invitation) => void
    isUnarchiving: boolean
}

export function useInvitationUnarchiveAction({
    rowSelection,
    setRowSelection,
    archiveInvitationMutation,
    unarchiveInvitationMutation,
    bulkArchiveMutation,
    bulkUnarchiveMutation,
}: UseInvitationUnarchiveActionOptions): UseInvitationUnarchiveActionResult {
    const unarchiveInvitation = useCallback(
        (invitation: Invitation) => {
            const selectedIds = getSelectedRowIds(rowSelection)

            if (selectedIds.length > 0) {
                const ids = selectedIds
                bulkUnarchiveMutation.mutate(ids, {
                    onSuccess: (response: MemberMutationResponse) => {
                        showUndoToast(response?.message || "Invitations unarchived", {
                            onUndo: () => bulkArchiveMutation.mutate(ids),
                            duration: 8000,
                        })
                        setRowSelection({})
                    },
                    onError: (err: Error) => {
                        showRetryErrorToast(err.message || "Failed to unarchive invitations", {
                            onRetry: () => bulkUnarchiveMutation.mutate(ids),
                        })
                    },
                })
                return
            }

            const invitationId = invitation.id
            unarchiveInvitationMutation.mutate(invitationId, {
                onSuccess: (response: MemberMutationResponse) => {
                    showUndoToast(response?.message || "Invitation unarchived", {
                        onUndo: () => archiveInvitationMutation.mutate(invitationId),
                    })
                },
                onError: (err: Error) => {
                    showRetryErrorToast(err.message || "Failed to unarchive invitation", {
                        onRetry: () => unarchiveInvitationMutation.mutate(invitationId),
                    })
                },
            })
        },
        [
            archiveInvitationMutation,
            bulkArchiveMutation,
            bulkUnarchiveMutation,
            rowSelection,
            setRowSelection,
            unarchiveInvitationMutation,
        ]
    )

    return {
        unarchiveInvitation,
        isUnarchiving: unarchiveInvitationMutation.isPending || bulkUnarchiveMutation.isPending,
    }
}
