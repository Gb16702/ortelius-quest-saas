import { type Dispatch, type SetStateAction, useCallback } from "react"
import type { Invitation, InviteForm } from "@/entities/invitation"
import { getErrorMessage } from "@/shared/lib/error"
import { showPromiseToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import {
    useResendInvitation,
    useSendInvitations,
} from "../../api/member-invitation-delivery.mutations"

interface UseInvitationDeliveryActionsOptions {
    organizationId: string
    invitationsHref: string
    setShowInviteDialog: Dispatch<SetStateAction<boolean>>
}

interface UseInvitationDeliveryActionsResult {
    sendInvitations: (forms: InviteForm[]) => void
    resendInvitation: (invitation: Invitation) => void
    isInviting: boolean
}

export function useInvitationDeliveryActions({
    organizationId,
    invitationsHref,
    setShowInviteDialog,
}: UseInvitationDeliveryActionsOptions): UseInvitationDeliveryActionsResult {
    const sendInvitationsMutation = useSendInvitations(organizationId)
    const resendInvitationMutation = useResendInvitation(organizationId)

    const sendInvitations = useCallback(
        (forms: InviteForm[]) => {
            if (!organizationId) return

            const invitationPayloads = forms.map((form) => ({
                email: form.email.trim(),
                role: form.role,
            }))

            const isSingle = forms.length === 1
            const promise = sendInvitationsMutation.mutateAsync(invitationPayloads)

            showPromiseToast(promise, {
                loading: isSingle ? "Sending invitation..." : "Sending invitations...",
                success: isSingle ? "Sent invitation" : "Sent invitations",
                error: (err) => getErrorMessage(err, "Failed to send invitations"),
                successAction: { label: "View invitations", href: invitationsHref },
            })

            promise.then(() => setShowInviteDialog(false))
        },
        [organizationId, sendInvitationsMutation, invitationsHref, setShowInviteDialog]
    )

    const resendInvitation = useCallback(
        (invitation: Invitation) => {
            const invitationId = invitation.id
            resendInvitationMutation.mutate(invitationId, {
                onSuccess: () => {
                    showSuccessToast(`Invitation resent to ${invitation.email}`)
                },
                onError: (err: Error) => {
                    showRetryErrorToast(err.message || "Failed to resend invitation", {
                        onRetry: () => resendInvitationMutation.mutate(invitationId),
                    })
                },
            })
        },
        [resendInvitationMutation]
    )

    return {
        sendInvitations,
        resendInvitation,
        isInviting: sendInvitationsMutation.isPending,
    }
}
