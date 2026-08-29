import { useCallback } from "react"
import type { InviteForm } from "@/entities/invitation"
import type { OrganizationMember } from "@/entities/member"
import { getErrorMessage } from "@/shared/lib/error"
import {
    showPromiseToast,
    showRetryErrorToast,
    showSuccessToast,
    showUndoToast,
} from "@/shared/ui/toasts"
import { useSendInvitations } from "../../api/member-invitation-delivery.mutations"
import { useRemoveMember } from "../../api/member-organization.mutations"
import { useUpdateMemberRole } from "../../api/member-role.mutations"

type MemberDialogState =
    | { type: "idle" }
    | { type: "edit"; memberId: string; selectedRole: string }
    | { type: "remove"; memberId: string }
    | { type: "invite" }

interface UseMembersMutationActionsOptions {
    organizationId: string
    invitationsHref: string
    dialog: MemberDialogState
    selectedMember: OrganizationMember | null
    removingMember: OrganizationMember | null
    closeDialog: () => void
}

interface UseMembersMutationActionsResult {
    sendInvitations: (forms: InviteForm[]) => void
    confirmEditRole: () => void
    confirmRemoveMember: () => void
    isUpdatingRole: boolean
    isRemovingMember: boolean
    isInviting: boolean
}

export function useMembersMutationActions({
    organizationId,
    invitationsHref,
    dialog,
    selectedMember,
    removingMember,
    closeDialog,
}: UseMembersMutationActionsOptions): UseMembersMutationActionsResult {
    const updateRoleMutation = useUpdateMemberRole(organizationId)
    const removeMemberMutation = useRemoveMember(organizationId)
    const sendInvitationsMutation = useSendInvitations(organizationId)

    const sendInvitations = useCallback(
        (forms: InviteForm[]) => {
            if (!organizationId) return

            const invitations = forms.map((form) => ({
                email: form.email.trim(),
                role: form.role,
            }))

            const isSingle = forms.length === 1
            const promise = sendInvitationsMutation.mutateAsync(invitations)

            showPromiseToast(promise, {
                loading: isSingle ? "Sending invitation..." : "Sending invitations...",
                success: isSingle ? "Sent invitation" : "Sent invitations",
                error: (err) => getErrorMessage(err, "Failed to send invitations"),
                successAction: { label: "View invitations", href: invitationsHref },
            })

            promise.then(closeDialog)
        },
        [organizationId, sendInvitationsMutation, invitationsHref, closeDialog]
    )

    const confirmEditRole = useCallback(() => {
        if (
            dialog.type !== "edit" ||
            !selectedMember ||
            !dialog.selectedRole ||
            dialog.selectedRole === selectedMember.role
        ) {
            return
        }

        const memberId = selectedMember.id
        const nextRole = dialog.selectedRole
        const previousRole = selectedMember.role

        updateRoleMutation.mutate(
            { memberId, role: nextRole },
            {
                onSuccess: () => {
                    showUndoToast("Role updated", {
                        onUndo: () => updateRoleMutation.mutate({ memberId, role: previousRole }),
                    })
                    closeDialog()
                },
                onError: () =>
                    showRetryErrorToast("Failed to update role", {
                        onRetry: () => updateRoleMutation.mutate({ memberId, role: nextRole }),
                    }),
            }
        )
    }, [dialog, selectedMember, updateRoleMutation, closeDialog])

    const confirmRemoveMember = useCallback(() => {
        if (!removingMember) return

        const memberId = removingMember.id
        removeMemberMutation.mutate(memberId, {
            onSuccess: () => {
                showSuccessToast("Member removed")
                closeDialog()
            },
            onError: () => {
                showRetryErrorToast("Failed to remove member", {
                    onRetry: () => removeMemberMutation.mutate(memberId),
                })
                closeDialog()
            },
        })
    }, [removingMember, removeMemberMutation, closeDialog])

    return {
        sendInvitations,
        confirmEditRole,
        confirmRemoveMember,
        isUpdatingRole: updateRoleMutation.isPending,
        isRemovingMember: removeMemberMutation.isPending,
        isInviting: sendInvitationsMutation.isPending,
    }
}
