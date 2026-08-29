import { useId, useState } from "react"
import { formatCurrency } from "@/shared/lib/currency"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Field, FieldLabel } from "@/shared/ui/field"
import { Separator } from "@/shared/ui/separator"
import type { Quote } from "../../model/hooks/use-quote"

interface QuoteAcceptanceDialogProps {
    isOpen: boolean
    onClose: () => void
    quote: Quote | null
    onConfirm: () => void
    isLoading: boolean
}

export function QuoteAcceptanceDialog({
    isOpen,
    onClose,
    quote,
    onConfirm,
    isLoading,
}: QuoteAcceptanceDialogProps) {
    const termsId = useId()
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    const confirmAcceptance = () => {
        if (!agreedToTerms) return
        onConfirm()
    }

    const closeDialog = () => {
        setAgreedToTerms(false)
        onClose()
    }

    if (!quote) return null

    return (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
            <DialogContent>
                <DialogHeader className="border-b">
                    <DialogTitle>Accept Quote</DialogTitle>
                    <DialogDescription>
                        Please review the quote details before accepting
                    </DialogDescription>
                </DialogHeader>

                <DialogBody>
                    <div className="space-y-4">
                        <div className="space-y-6 rounded-sm border border-ds-surface-border bg-ds-surface py-4">
                            <div className="flex justify-between px-4 text-sm">
                                <span className="font-medium text-ds-fg">
                                    Quote {quote.quoteNumber}
                                </span>
                            </div>

                            <div className="flex justify-between px-4 text-sm">
                                <span className="text-ds-fg">Total (Excl. VAT)</span>
                                <span className="text-ds-fg">
                                    {formatCurrency(quote.pricing.totalHT, quote.pricing.currency)}
                                </span>
                            </div>

                            <div className="flex justify-between px-4 text-sm">
                                <span className="text-ds-fg">VAT ({quote.pricing.vatRate}%)</span>
                                <span className="text-ds-fg">
                                    {formatCurrency(
                                        quote.pricing.vatAmount,
                                        quote.pricing.currency
                                    )}
                                </span>
                            </div>

                            <Separator />

                            <div className="flex justify-between px-4">
                                <span className="font-medium text-ds-fg text-sm">Total</span>
                                <span className="font-medium text-ds-fg text-sm">
                                    {formatCurrency(quote.pricing.totalTTC, quote.pricing.currency)}
                                </span>
                            </div>
                        </div>

                        <Field
                            orientation="horizontal"
                            className="items-start gap-3 rounded-sm border border-ds-surface-border bg-ds-surface p-4"
                        >
                            <Checkbox
                                id={termsId}
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                            />
                            <FieldLabel
                                htmlFor={termsId}
                                className="relative bottom-0.5 cursor-pointer text-ds-fg text-sm leading-relaxed"
                            >
                                I have reviewed and accept the terms and conditions of this quote.
                                An invoice will be generated based on the accepted quote.
                            </FieldLabel>
                        </Field>
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        radius="full"
                        size={"lg"}
                        variant="outline"
                        onClick={closeDialog}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        radius="full"
                        size={"lg"}
                        variant="solid"
                        onClick={confirmAcceptance}
                        disabled={!agreedToTerms || isLoading}
                    >
                        Accept Quote
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
