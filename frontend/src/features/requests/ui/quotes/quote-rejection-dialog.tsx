import { useId, useRef, useState } from "react"
import * as v from "valibot"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Spinner } from "@/shared/ui/spinner"
import { Textarea } from "@/shared/ui/textarea"
import type { Quote } from "../../model/hooks/use-quote"

const quoteRejectionReasonSchema = v.object({
    reason: v.pipe(v.string(), v.trim(), v.minLength(1, "Please provide a reason for rejection.")),
})

interface QuoteRejectionDialogProps {
    isOpen: boolean
    onClose: () => void
    quote: Quote | null
    onConfirm: (reason: string) => void
    isLoading: boolean
}

export function QuoteRejectionDialog({
    isOpen,
    onClose,
    quote,
    onConfirm,
    isLoading,
}: QuoteRejectionDialogProps) {
    const [reason, setReason] = useState("")
    const [error, setError] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const reasonId = useId()

    const confirmRejection = () => {
        const parsed = safeParseSchema(quoteRejectionReasonSchema, { reason })
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Please provide a reason for rejection.")
            textareaRef.current?.focus()
            return
        }
        setError(null)
        onConfirm(parsed.data.reason)
    }

    const closeDialog = () => {
        setReason("")
        setError(null)
        onClose()
    }

    if (!quote) return null

    return (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
            <DialogContent>
                <DialogHeader className="border-b">
                    <DialogTitle>Reject Quote</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting this quote. The organization will be
                        notified and can send you a revised quote.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-8 overflow-y-auto bg-ds-canvas px-8 py-8">
                    <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-ds-fg-muted">Quote Number</span>
                            <span className="font-medium text-ds-fg">{quote.quoteNumber}</span>
                        </div>
                    </div>

                    <Field data-invalid={!!error} className="gap-2">
                        <FieldLabel htmlFor={reasonId}>Reason for rejection</FieldLabel>
                        <Textarea
                            id={reasonId}
                            ref={textareaRef}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value)
                                if (error) setError(null)
                            }}
                            placeholder="Please explain why you're rejecting this quote"
                            maxLength={500}
                            disabled={isLoading}
                            aria-invalid={!!error}
                            className="min-h-32 resize-none"
                        />
                        {error && <FieldError>{error}</FieldError>}
                    </Field>
                </div>

                <DialogFooter>
                    <Button
                        size={"lg"}
                        radius="full"
                        variant="outline"
                        onClick={closeDialog}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        size={"lg"}
                        radius="full"
                        variant="danger"
                        onClick={confirmRejection}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="mr-2" />
                                Rejecting...
                            </>
                        ) : (
                            "Reject Quote"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
