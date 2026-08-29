import { Suspense } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog"
import { LazyDialogBodySpinner } from "@/shared/ui/lazy-dialog-body-spinner"
import { LazyUpdatePaymentMethodDialogContent } from "./update-payment-method-dialog-lazy-content"

interface UpdatePaymentMethodDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "add" | "update"
    organizationId: string
    className?: string
    overlayClassName?: string
}

export { PaymentMethodForm } from "./update-payment-method-dialog-content"

export function UpdatePaymentMethodDialog({
    open,
    onOpenChange,
    mode,
    organizationId,
    className,
    overlayClassName,
}: UpdatePaymentMethodDialogProps) {
    const title = mode === "add" ? "Add payment method" : "Update payment method"

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent className={className} overlayClassName={overlayClassName}>
                <DialogHeader className="border-b">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <Suspense
                    fallback={
                        <LazyDialogBodySpinner
                            label="Loading payment form..."
                            className="min-h-[360px]"
                        />
                    }
                >
                    <LazyUpdatePaymentMethodDialogContent
                        open={open}
                        onOpenChange={onOpenChange}
                        mode={mode}
                        organizationId={organizationId}
                    />
                </Suspense>
            </DialogContent>
        </Dialog>
    )
}
