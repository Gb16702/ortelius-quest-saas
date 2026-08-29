import type { RowSelectionState } from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import type { Invitation } from "@/entities/invitation"
import { useInvitationCancelConfirmation } from "./use-invitation-cancel-confirmation"
import { useInvitationCancelPrompt } from "./use-invitation-cancel-prompt"

interface UseInvitationCancelActionsOptions {
    organizationId: string
    invitations: Invitation[]
    rowSelection: RowSelectionState
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
    setCancelInvitation: Dispatch<SetStateAction<string | null>>
    cancelingInvitation: Invitation | undefined
    closeModals: () => void
}

interface UseInvitationCancelActionsResult {
    promptCancelInvitation: (invitation: Invitation) => void
    confirmCancelInvitation: () => void
    isCanceling: boolean
}

export function useInvitationCancelActions({
    organizationId,
    invitations,
    rowSelection,
    setRowSelection,
    setCancelInvitation,
    cancelingInvitation,
    closeModals,
}: UseInvitationCancelActionsOptions): UseInvitationCancelActionsResult {
    const { promptCancelInvitation } = useInvitationCancelPrompt({
        invitations,
        rowSelection,
        setCancelInvitation,
    })
    const confirmationAction = useInvitationCancelConfirmation({
        organizationId,
        invitations,
        rowSelection,
        setRowSelection,
        cancelingInvitation,
        closeModals,
    })

    return {
        promptCancelInvitation,
        ...confirmationAction,
    }
}
