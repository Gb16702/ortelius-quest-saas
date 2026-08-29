import type { RowSelectionState } from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import type { Invitation, InviteForm } from "@/entities/invitation"
import { useInvitationArchiveActions } from "./use-invitation-archive-actions"
import { useInvitationCancelActions } from "./use-invitation-cancel-actions"
import { useInvitationDeliveryActions } from "./use-invitation-delivery-actions"
import { useInvitationRoleActions } from "./use-invitation-role-actions"

interface UseInvitationsMutationActionsOptions {
    organizationId: string
    invitationsHref: string
    invitations: Invitation[]
    rowSelection: RowSelectionState
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
    setCancelInvitation: Dispatch<SetStateAction<string | null>>
    setShowInviteDialog: Dispatch<SetStateAction<boolean>>
    editingInvitation: Invitation | undefined
    cancelingInvitation: Invitation | undefined
    selectedRole: string
    closeModals: () => void
}

interface UseInvitationsMutationActionsResult {
    sendInvitations: (forms: InviteForm[]) => void
    resendInvitation: (invitation: Invitation) => void
    promptCancelInvitation: (invitation: Invitation) => void
    confirmCancelInvitation: () => void
    confirmEditRole: () => void
    archiveInvitation: (invitation: Invitation) => void
    unarchiveInvitation: (invitation: Invitation) => void
    isArchiving: boolean
    isUnarchiving: boolean
    isCanceling: boolean
    isInviting: boolean
    isUpdatingRole: boolean
}

export function useInvitationsMutationActions({
    organizationId,
    invitationsHref,
    invitations,
    rowSelection,
    setRowSelection,
    setCancelInvitation,
    setShowInviteDialog,
    editingInvitation,
    cancelingInvitation,
    selectedRole,
    closeModals,
}: UseInvitationsMutationActionsOptions): UseInvitationsMutationActionsResult {
    const deliveryActions = useInvitationDeliveryActions({
        organizationId,
        invitationsHref,
        setShowInviteDialog,
    })
    const cancelActions = useInvitationCancelActions({
        organizationId,
        invitations,
        rowSelection,
        setRowSelection,
        setCancelInvitation,
        cancelingInvitation,
        closeModals,
    })
    const archiveActions = useInvitationArchiveActions({
        organizationId,
        rowSelection,
        setRowSelection,
    })
    const roleActions = useInvitationRoleActions({
        organizationId,
        editingInvitation,
        selectedRole,
        closeModals,
    })

    return {
        ...deliveryActions,
        ...cancelActions,
        ...archiveActions,
        ...roleActions,
    }
}
