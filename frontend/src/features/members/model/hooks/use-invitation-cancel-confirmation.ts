import type { RowSelectionState } from "@tanstack/react-table"
import { type Dispatch, type SetStateAction, useCallback } from "react"
import type { Invitation } from "@/entities/invitation"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import {
    useBulkCancelInvitations,
    useCancelInvitation,
} from "../../api/member-invitation-status.mutations"
import type { MemberMutationResponse } from "../../api/member-mutation.response"
import { getSelectedRowIds } from "./get-selected-row-ids"

interface UseInvitationCancelConfirmationOptions {
    organizationId: string
    invitations: Invitation[]
    rowSelection: RowSelectionState
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
    cancelingInvitation: Invitation | undefined
    closeModals: () => void
}

interface UseInvitationCancelConfirmationResult {
    confirmCancelInvitation: () => void
    isCanceling: boolean
}

export function useInvitationCancelConfirmation({
    organizationId,
    invitations,
    rowSelection,
    setRowSelection,
    cancelingInvitation,
    closeModals,
}: UseInvitationCancelConfirmationOptions): UseInvitationCancelConfirmationResult {
    const cancelInvitationMutation = useCancelInvitation(organizationId)
    const bulkCancelMutation = useBulkCancelInvitations(organizationId)

    const confirmCancelInvitation = useCallback(() => {
        const selectedIds = getSelectedRowIds(rowSelection)

        if (selectedIds.length > 0) {
            const pendingInvitations = invitations.filter(
                (inv) => selectedIds.includes(inv.id) && inv.status === "pending"
            )
            const pendingIds = pendingInvitations.map((inv) => inv.id)

            bulkCancelMutation.mutate(pendingIds, {
                onSuccess: (response: MemberMutationResponse) => {
                    const message =
                        response?.data?.message || response?.message || "Invitations canceled"
                    showSuccessToast(message)

                    if (pendingIds.length < selectedIds.length) {
                        const skippedCount = selectedIds.length - pendingIds.length
                        showErrorToast(
                            `${skippedCount} invitation${skippedCount > 1 ? "s were" : " was"} skipped (not pending)`
                        )
                    }

                    setRowSelection({})
                    closeModals()
                },
                onError: (err: Error) => {
                    showRetryErrorToast(err.message || "Failed to cancel invitations", {
                        onRetry: () => bulkCancelMutation.mutate(pendingIds),
                    })
                    closeModals()
                },
            })
        } else if (cancelingInvitation) {
            const invitationId = cancelingInvitation.id
            cancelInvitationMutation.mutate(invitationId, {
                onSuccess: () => {
                    showSuccessToast("Invitation canceled")
                    closeModals()
                },
                onError: (err: Error) => {
                    showRetryErrorToast(err.message || "Failed to cancel invitation", {
                        onRetry: () => cancelInvitationMutation.mutate(invitationId),
                    })
                    closeModals()
                },
            })
        }
    }, [
        bulkCancelMutation,
        cancelInvitationMutation,
        cancelingInvitation,
        closeModals,
        invitations,
        rowSelection,
        setRowSelection,
    ])

    return {
        confirmCancelInvitation,
        isCanceling: cancelInvitationMutation.isPending || bulkCancelMutation.isPending,
    }
}
