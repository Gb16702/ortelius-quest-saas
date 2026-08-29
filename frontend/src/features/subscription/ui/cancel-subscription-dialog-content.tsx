import { useState } from "react"
import { useTranslation } from "react-i18next"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import { DialogBody, DialogClose, DialogFooter } from "@/shared/ui/dialog"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from "@/shared/ui/field"
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group"
import { Spinner } from "@/shared/ui/spinner"
import { Textarea } from "@/shared/ui/textarea"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useCancelSubscription } from "../api/subscription.mutations"
import { cancelReasonsSchema } from "../model/schemas/subscription-api.schema"
import type { CancelReason } from "../model/subscription"

const FEEDBACK_MAX = 500

const REASON_VALUES: CancelReason[] = [
    "too_expensive",
    "temporary_break",
    "missing_features",
    "switching_to_competitor",
    "low_usage",
    "bugs_or_errors",
    "other",
]

interface CancelSubscriptionDialogContentProps {
    onOpenChange: (open: boolean) => void
    organizationId: string
    planDisplayName: string
}

export function CancelSubscriptionDialogContent({
    onOpenChange,
    organizationId,
    planDisplayName,
}: CancelSubscriptionDialogContentProps) {
    const { t } = useTranslation("settings")
    const [reason, setReason] = useState<CancelReason | "">("")
    const [feedback, setFeedback] = useState("")
    const cancelMutation = useCancelSubscription(organizationId)

    const handleConfirm = () => {
        const variables = {
            reason: reason || null,
            feedback: feedback.trim() || null,
        }
        const runCancel = () => {
            cancelMutation.mutate(variables, {
                onSuccess: () => {
                    showSuccessToast(t("subscription.toast.canceled"))
                    setReason("")
                    setFeedback("")
                    onOpenChange(false)
                },
                onError: (err) => {
                    showRetryErrorToast(err.message, { onRetry: runCancel })
                },
            })
        }
        runCancel()
    }

    return (
        <>
            <DialogBody className="flex-1 space-y-6 overflow-y-auto">
                <FieldSet className="gap-3">
                    <FieldLegend className="mb-0" variant="label">
                        {t("subscription.cancel.reasonLegend")}{" "}
                        <span className="font-normal text-ds-fg-muted">
                            {t("subscription.cancel.optional")}
                        </span>
                    </FieldLegend>
                    <RadioGroup
                        value={reason}
                        onValueChange={(value) => {
                            const result = safeParseSchema(cancelReasonsSchema, value)
                            if (result.success) setReason(result.data)
                        }}
                        className="gap-2"
                    >
                        {REASON_VALUES.map((value) => (
                            <Field key={value} orientation="horizontal" className="gap-3">
                                <RadioGroupItem id={`reason-${value}`} value={value} />
                                <FieldLabel
                                    htmlFor={`reason-${value}`}
                                    className="cursor-pointer font-normal text-ds-fg text-sm"
                                >
                                    {t(`subscription.cancel.reason.${value}`)}
                                </FieldLabel>
                            </Field>
                        ))}
                    </RadioGroup>
                </FieldSet>

                <Field>
                    <FieldContent>
                        <FieldTitle>
                            {t("subscription.cancel.feedbackLabel")}{" "}
                            <span className="font-normal text-ds-fg-muted">
                                {t("subscription.cancel.optional")}
                            </span>
                        </FieldTitle>
                    </FieldContent>
                    <Textarea
                        className="resize-none"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_MAX))}
                        rows={4}
                        placeholder={t("subscription.cancel.feedbackPlaceholder")}
                    />
                    <FieldDescription className="text-right">
                        {feedback.length}/{FEEDBACK_MAX}
                    </FieldDescription>
                </Field>
            </DialogBody>

            <DialogFooter>
                <DialogClose asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        radius="full"
                        disabled={cancelMutation.isPending}
                    >
                        {t("subscription.cancel.keepPlan", { planName: planDisplayName })}
                    </Button>
                </DialogClose>
                <Button
                    type="button"
                    variant="danger"
                    size="md"
                    radius="full"
                    disabled={cancelMutation.isPending}
                    onClick={handleConfirm}
                >
                    {cancelMutation.isPending ? (
                        <>
                            <Spinner className="mr-2" />
                            {t("subscription.cancel.canceling")}
                        </>
                    ) : (
                        t("subscription.cancel.confirmAction")
                    )}
                </Button>
            </DialogFooter>
        </>
    )
}
