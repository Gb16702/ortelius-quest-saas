import type { RowSelectionState } from "@tanstack/react-table"
import { type Dispatch, type SetStateAction, useCallback } from "react"
import type { Invitation } from "@/entities/invitation"
import { showErrorToast } from "@/shared/ui/toasts"
import { getSelectedRowIds } from "./get-selected-row-ids"

interface UseInvitationCancelPromptOptions {
    invitations: Invitation[]
    rowSelection: RowSelectionState
    setCancelInvitation: Dispatch<SetStateAction<string | null>>
}

interface UseInvitationCancelPromptResult {
    promptCancelInvitation: (invitation: Invitation) => void
}

export function useInvitationCancelPrompt({
    invitations,
    rowSelection,
    setCancelInvitation,
}: UseInvitationCancelPromptOptions): UseInvitationCancelPromptResult {
    const promptCancelInvitation = useCallback(
        (invitation: Invitation) => {
            const selectedIds = getSelectedRowIds(rowSelection)

            if (selectedIds.length > 0) {
                const pendingInvitations = invitations.filter(
                    (inv) => selectedIds.includes(inv.id) && inv.status === "pending"
                )

                if (pendingInvitations.length === 0) {
                    showErrorToast(
                        "No pending invitations selected. Only pending invitations can be canceled."
                    )
                    return
                }

                setCancelInvitation(invitation.id)
                return
            }

            if (invitation.status !== "pending") {
                showErrorToast("Only pending invitations can be canceled")
                return
            }

            setCancelInvitation(invitation.id)
        },
        [invitations, rowSelection, setCancelInvitation]
    )

    return { promptCancelInvitation }
}
