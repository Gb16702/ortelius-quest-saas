import { useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
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
import type { RequestData } from "../model/request"

const REASON_REQUIRED_KEY = "requests:rejectionDialog.reasonRequired"

const rejectionReasonSchema = v.object({
    reason: v.pipe(v.string(), v.trim(), v.minLength(1, REASON_REQUIRED_KEY)),
})

interface RequestRejectionDialogProps {
    isOpen: boolean
    onClose: () => void
    request: RequestData | null
    onConfirm: (reason: string) => void
    isLoading: boolean
}

export function RequestRejectionDialog({
    isOpen,
    onClose,
    request,
    onConfirm,
    isLoading,
}: RequestRejectionDialogProps) {
    const { t } = useTranslation("requests")
    const [reason, setReason] = useState("")
    const [error, setError] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const reasonId = useId()

    const confirmRejection = () => {
        const parsed = safeParseSchema(rejectionReasonSchema, { reason })
        if (!parsed.success) {
            const messageKey = parsed.error.issues[0]?.message ?? REASON_REQUIRED_KEY
            setError(t(messageKey, { defaultValue: messageKey }))
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

    if (!request) return null

    return (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
            <DialogContent>
                <DialogHeader className="border-b">
                    <DialogTitle>{t("rejectionDialog.title")}</DialogTitle>
                    <DialogDescription>{t("rejectionDialog.description")}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-8 overflow-y-auto bg-ds-canvas px-8 py-8">
                    <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-ds-fg-muted">
                                {t("rejectionDialog.requestNumberLabel")}
                            </span>
                            <span className="font-medium text-ds-fg">{request.reqNumber}</span>
                        </div>
                    </div>

                    <Field data-invalid={!!error} className="gap-2">
                        <FieldLabel htmlFor={reasonId}>
                            {t("rejectionDialog.reasonLabel")}
                        </FieldLabel>
                        <Textarea
                            id={reasonId}
                            ref={textareaRef}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value)
                                if (error) setError(null)
                            }}
                            placeholder={t("rejectionDialog.reasonPlaceholder")}
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
                        size="lg"
                        radius="full"
                        variant="outline"
                        onClick={closeDialog}
                        disabled={isLoading}
                    >
                        {t("action.cancel", { ns: "common" })}
                    </Button>
                    <Button
                        size="lg"
                        radius="full"
                        variant="danger"
                        onClick={confirmRejection}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="mr-2" />
                                {t("rejectionDialog.submitting")}
                            </>
                        ) : (
                            t("rejectionDialog.submit")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
