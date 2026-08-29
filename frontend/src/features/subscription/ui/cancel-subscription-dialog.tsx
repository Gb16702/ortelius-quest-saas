import { format as formatDateFns } from "date-fns"
import { useTranslation } from "react-i18next"
import { getDateFnsLocale } from "@/shared/lib/i18n/date-fns-locale"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { CancelSubscriptionDialogContent } from "./cancel-subscription-dialog-content"

interface CancelSubscriptionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    planDisplayName: string
    accessEndsAt: string | null
}

export function CancelSubscriptionDialog({
    open,
    onOpenChange,
    organizationId,
    planDisplayName,
    accessEndsAt,
}: CancelSubscriptionDialogProps) {
    const { t, i18n } = useTranslation("settings")
    const accessDateLabel = accessEndsAt
        ? formatDateFns(new Date(accessEndsAt), "PPP", { locale: getDateFnsLocale(i18n.language) })
        : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent className="max-h-[calc(100vh-4rem)]">
                <DialogHeader className="border-b">
                    <DialogTitle>{t("subscription.cancel.dialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {accessDateLabel
                            ? t("subscription.cancel.loseFeaturesWithDate", {
                                  planName: planDisplayName,
                                  date: accessDateLabel,
                              })
                            : t("subscription.cancel.loseFeaturesEnd", {
                                  planName: planDisplayName,
                              })}
                    </DialogDescription>
                </DialogHeader>

                <CancelSubscriptionDialogContent
                    onOpenChange={onOpenChange}
                    organizationId={organizationId}
                    planDisplayName={planDisplayName}
                />
            </DialogContent>
        </Dialog>
    )
}
