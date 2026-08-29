import { useTranslation } from "react-i18next"
import { useOrganizationInfo } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useLeaveOrganization } from "../api/organization-membership.mutations"
import { useLeaveOrganizationDialog } from "../model/hooks/use-leave-organization-dialog"
import { LeaveOrganizationDialog } from "./leave-organization-dialog"

interface LeaveOrganizationDialogManagerProps {
    sessionData: SessionResponse | null
    onNavigate?: (href: string) => void
    onRevalidate?: () => Promise<void> | void
}

export function LeaveOrganizationDialogManager({
    sessionData,
    onNavigate,
    onRevalidate,
}: LeaveOrganizationDialogManagerProps) {
    const { t } = useTranslation("account")
    const activeOrganizationId = sessionData?.session?.activeOrganizationId ?? null

    const { data: orgInfo } = useOrganizationInfo(activeOrganizationId)
    const { isOpen, close } = useLeaveOrganizationDialog()

    const leaveMutation = useLeaveOrganization(activeOrganizationId ?? "")

    if (!isOpen || !activeOrganizationId || !orgInfo?.name) {
        return null
    }

    const handleConfirm = () => {
        leaveMutation.mutate(undefined, {
            onSuccess: async () => {
                await onRevalidate?.()
                showSuccessToast(
                    t("leaveOrganization.toast.success", { organizationName: orgInfo.name })
                )
                close()
                if (onNavigate) {
                    onNavigate("/me/requests")
                    return
                }
                window.location.assign("/me/requests")
            },
            onError: (error: Error) => {
                showRetryErrorToast(error.message || t("leaveOrganization.toast.error"), {
                    onRetry: () => handleConfirm(),
                })
            },
        })
    }

    return (
        <LeaveOrganizationDialog
            isOpen={isOpen}
            organizationName={orgInfo.name}
            isSubmitting={leaveMutation.isPending}
            onConfirm={handleConfirm}
            onClose={close}
        />
    )
}
