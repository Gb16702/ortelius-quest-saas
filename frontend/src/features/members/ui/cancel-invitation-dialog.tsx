import { Trans, useTranslation } from "react-i18next"
import type { Invitation } from "@/entities/invitation"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Spinner } from "@/shared/ui/spinner"

interface CancelInvitationDialogProps {
    isOpen: boolean
    invitation: Invitation | null
    selectedCount?: number
    onClose: () => void
    onConfirm: () => void
    isSubmitting: boolean
}

export const CancelInvitationDialog = ({
    isOpen,
    invitation,
    selectedCount = 0,
    onClose,
    onConfirm,
    isSubmitting,
}: CancelInvitationDialogProps) => {
    const { t } = useTranslation("team")
    const isBulk = selectedCount > 0

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isBulk
                            ? t("cancelInvitationDialog.titleMany")
                            : t("cancelInvitationDialog.titleOne")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isBulk ? (
                            <Trans
                                i18nKey="cancelInvitationDialog.descriptionMany"
                                t={t}
                                count={selectedCount}
                                values={{ count: selectedCount }}
                                components={{
                                    strong: <span className="font-medium text-ds-fg text-sm" />,
                                }}
                            />
                        ) : (
                            <Trans
                                i18nKey="cancelInvitationDialog.descriptionOne"
                                t={t}
                                values={{ email: invitation?.email ?? "" }}
                                components={{
                                    strong: <span className="font-medium text-ds-fg text-sm" />,
                                }}
                            />
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>
                        {t("cancelInvitationDialog.close")}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner className="mr-2" />
                                {t("cancelInvitationDialog.canceling")}
                            </>
                        ) : isBulk ? (
                            t("cancelInvitationDialog.confirmMany")
                        ) : (
                            t("cancelInvitationDialog.confirmOne")
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
