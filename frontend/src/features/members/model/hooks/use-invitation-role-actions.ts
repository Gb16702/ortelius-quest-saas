import { useCallback } from "react"
import type { Invitation } from "@/entities/invitation"
import { showRetryErrorToast, showUndoToast } from "@/shared/ui/toasts"
import { useUpdateInvitationRole } from "../../api/member-invitation-role.mutations"

interface UseInvitationRoleActionsOptions {
    organizationId: string
    editingInvitation: Invitation | undefined
    selectedRole: string
    closeModals: () => void
}

interface UseInvitationRoleActionsResult {
    confirmEditRole: () => void
    isUpdatingRole: boolean
}

export function useInvitationRoleActions({
    organizationId,
    editingInvitation,
    selectedRole,
    closeModals,
}: UseInvitationRoleActionsOptions): UseInvitationRoleActionsResult {
    const updateInvitationRoleMutation = useUpdateInvitationRole(organizationId)

    const confirmEditRole = useCallback(() => {
        if (!editingInvitation || !selectedRole || selectedRole === editingInvitation.role) {
            return
        }

        const invitationId = editingInvitation.id
        const nextRole = selectedRole
        const previousRole = editingInvitation.role

        updateInvitationRoleMutation.mutate(
            { invitationId, role: nextRole },
            {
                onSuccess: () => {
                    showUndoToast("Invitation role updated", {
                        onUndo: () =>
                            updateInvitationRoleMutation.mutate({
                                invitationId,
                                role: previousRole,
                            }),
                    })
                    closeModals()
                },
                onError: (err: Error) => {
                    showRetryErrorToast(err.message || "Failed to update invitation role", {
                        onRetry: () =>
                            updateInvitationRoleMutation.mutate({
                                invitationId,
                                role: nextRole,
                            }),
                    })
                    closeModals()
                },
            }
        )
    }, [closeModals, editingInvitation, selectedRole, updateInvitationRoleMutation])

    return {
        confirmEditRole,
        isUpdatingRole: updateInvitationRoleMutation.isPending,
    }
}
