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

interface UseInvitationArchiveActionOptions {
    rowSelection: RowSelectionState
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
    archiveInvitationMutation: ArchiveInvitationMutation
    unarchiveInvitationMutation: UnarchiveInvitationMutation
    bulkArchiveMutation: BulkArchiveMutation
    bulkUnarchiveMutation: BulkUnarchiveMutation
}

interface UseInvitationArchiveActionResult {
    archiveInvitation: (invitation: Invitation) => void
    isArchiving: boolean
}

export function useInvitationArchiveAction({
    rowSelection,
    setRowSelection,
    archiveInvitationMutation,
    unarchiveInvitationMutation,
    bulkArchiveMutation,
    bulkUnarchiveMutation,
}: UseInvitationArchiveActionOptions): UseInvitationArchiveActionResult {
    const archiveInvitation = useCallback(
        (invitation: Invitation) => {
            const selectedIds = getSelectedRowIds(rowSelection)

            if (selectedIds.length > 0) {
                const ids = selectedIds
                bulkArchiveMutation.mutate(ids, {
                    onSuccess: (response: MemberMutationResponse) => {
                        showUndoToast(response?.message || "Invitations archived", {
                            onUndo: () => bulkUnarchiveMutation.mutate(ids),
                            duration: 8000,
                        })
                        setRowSelection({})
                    },
                    onError: (err: Error) => {
                        showRetryErrorToast(err.message || "Failed to archive invitations", {
                            onRetry: () => bulkArchiveMutation.mutate(ids),
                        })
                    },
                })
                return
            }

            const invitationId = invitation.id
            archiveInvitationMutation.mutate(invitationId, {
                onSuccess: (response: MemberMutationResponse) => {
                    showUndoToast(response?.message || "Invitation archived", {
                        onUndo: () => unarchiveInvitationMutation.mutate(invitationId),
                    })
                },
                onError: (err: Error) => {
                    showRetryErrorToast(err.message || "Failed to archive invitation", {
                        onRetry: () => archiveInvitationMutation.mutate(invitationId),
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
        archiveInvitation,
        isArchiving: archiveInvitationMutation.isPending || bulkArchiveMutation.isPending,
    }
}
