import { useTranslation } from "react-i18next"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { PricingDataDialogContent } from "./pricing-data-dialog-content"

interface PricingDataDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string | null
    onClose: () => void
}

export function PricingDataDialog({
    open,
    onOpenChange,
    organizationId,
    onClose,
}: PricingDataDialogProps) {
    const { t } = useTranslation("settings")
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader className="border-ds-surface-border border-b">
                    <DialogTitle>{t("business.pricingDialog.title")}</DialogTitle>
                    <DialogDescription>{t("business.pricingDialog.description")}</DialogDescription>
                </DialogHeader>
                <PricingDataDialogContent organizationId={organizationId} onClose={onClose} />
            </DialogContent>
        </Dialog>
    )
}
