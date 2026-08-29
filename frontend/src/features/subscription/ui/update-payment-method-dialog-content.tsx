import {
    AddressElement,
    Elements,
    PaymentElement,
    useElements,
    useStripe,
} from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import { TriangleAlert } from "lucide-react"
import { useId, useMemo, useState } from "react"
// TODO_i18n_review: Stripe Elements wrapper copy (submit errors, validation messages,
// "Use this billing address as primary", Save/Add labels) remains English; translations
// exist under settings.json paymentMethod.dialog.* and need a focused pass.
import { useOrg } from "@/entities/organization"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { DialogBody, DialogClose, DialogFooter } from "@/shared/ui/dialog"
import { Field, FieldLabel } from "@/shared/ui/field"
import { Spinner } from "@/shared/ui/spinner"
import { showErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useBillingAddress } from "../api/subscription.api"
import {
    useSetupIntent,
    useUpdateBillingAddress,
    useUpdatePaymentMethod,
} from "../api/subscription.mutations"
import { stripePromise } from "../lib/stripe"
import { STRIPE_APPEARANCE } from "../lib/stripe-appearance"
import type { BillingAddress } from "../model/subscription"

interface UpdatePaymentMethodDialogContentProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "add" | "update"
    organizationId: string
}

export function UpdatePaymentMethodDialogContent({
    open,
    onOpenChange,
    mode,
    organizationId,
}: UpdatePaymentMethodDialogContentProps) {
    const { data: billingAddressData } = useBillingAddress(organizationId, open)
    const currentAddress = billingAddressData?.address ?? null

    const elementsOptions: StripeElementsOptions = {
        mode: "setup",
        currency: "eur",
        paymentMethodTypes: ["card", "sepa_debit"],
        appearance: STRIPE_APPEARANCE,
    }

    return (
        <Elements stripe={stripePromise} options={elementsOptions}>
            <PaymentMethodForm
                mode={mode}
                organizationId={organizationId}
                currentAddress={currentAddress}
                onSuccess={() => onOpenChange(false)}
            />
        </Elements>
    )
}

interface PaymentMethodFormProps {
    mode: "add" | "update"
    organizationId: string
    currentAddress: BillingAddress | null
    onSuccess: () => void
    onBack?: () => void
}

export function PaymentMethodForm({
    mode,
    organizationId,
    currentAddress,
    onSuccess,
    onBack,
}: PaymentMethodFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const setupIntent = useSetupIntent()
    const updatePaymentMethod = useUpdatePaymentMethod(organizationId)
    const updateBillingAddress = useUpdateBillingAddress(organizationId)
    const { meta } = useOrg()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [useAsPrimary, setUseAsPrimary] = useState(true)
    const useAsPrimaryId = useId()

    const addressDefaults = useMemo(
        () => ({
            address: {
                country: currentAddress?.country ?? "",
                line1: currentAddress?.line1 ?? "",
                line2: currentAddress?.line2 ?? "",
                city: currentAddress?.city ?? "",
                postal_code: currentAddress?.postalCode ?? "",
                state: currentAddress?.state ?? "",
            },
        }),
        [currentAddress]
    )

    // FIXME: refactor pending
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
    const handleConfirm = async () => {
        if (!stripe || !elements) return

        setSubmitError(null)
        setIsProcessing(true)

        const { error: validationError } = await elements.submit()
        if (validationError) {
            setSubmitError(validationError.message ?? "Please check your payment details.")
            setIsProcessing(false)
            return
        }

        const addressEl = elements.getElement(AddressElement)
        const addressValue = addressEl ? await addressEl.getValue() : null
        if (addressValue && !addressValue.complete) {
            setSubmitError("Please complete your billing address.")
            setIsProcessing(false)
            return
        }

        let clientSecret: string
        try {
            const result = await setupIntent.mutateAsync()
            clientSecret = result.clientSecret
        } catch (err) {
            setSubmitError(
                err instanceof Error
                    ? err.message
                    : "Couldn't start payment setup. Please try again."
            )
            setIsProcessing(false)
            return
        }

        const { error: confirmError, setupIntent: confirmedIntent } = await stripe.confirmSetup({
            elements,
            clientSecret,
            redirect: "if_required",
            confirmParams: {
                return_url: `${window.location.origin}/org/${meta.slug}/settings/billing`,
            },
        })

        if (confirmError) {
            setSubmitError(confirmError.message ?? "We couldn't save your payment method.")
            setIsProcessing(false)
            return
        }

        const paymentMethodId =
            typeof confirmedIntent?.payment_method === "string"
                ? confirmedIntent.payment_method
                : confirmedIntent?.payment_method?.id

        if (!paymentMethodId) {
            setSubmitError("We couldn't retrieve your payment method. Please try again.")
            setIsProcessing(false)
            return
        }

        try {
            await updatePaymentMethod.mutateAsync(paymentMethodId)
        } catch (err) {
            setIsProcessing(false)
            showErrorToast(err instanceof Error ? err.message : "Update failed")
            return
        }

        if (addressValue?.complete && useAsPrimary) {
            try {
                await updateBillingAddress.mutateAsync({
                    address: {
                        country: addressValue.value.address.country,
                        line1: addressValue.value.address.line1,
                        line2: addressValue.value.address.line2 ?? null,
                        city: addressValue.value.address.city,
                        postalCode: addressValue.value.address.postal_code,
                        state: addressValue.value.address.state ?? null,
                    },
                    name: addressValue.value.name ?? null,
                })
            } catch (err) {
                setSubmitError(
                    err instanceof Error
                        ? `Payment method saved, but billing address update failed: ${err.message}`
                        : "Payment method saved, but billing address update failed."
                )
                setIsProcessing(false)
                showErrorToast("Payment method saved, but billing address update failed")
                return
            }
        }

        showSuccessToast(mode === "add" ? "Payment method added" : "Payment method updated")
        onSuccess()
    }

    const isBusy =
        isProcessing ||
        updatePaymentMethod.isPending ||
        updateBillingAddress.isPending ||
        !stripe ||
        !elements

    const primaryLabel = mode === "add" ? "Add" : "Save"

    return (
        <>
            <DialogBody>
                <div className="space-y-6">
                    <PaymentElement
                        options={{
                            layout: { type: "tabs" },
                            terms: { card: "never", paypal: "never" },
                        }}
                    />
                    <AddressElement
                        options={{
                            mode: "billing",
                            defaultValues: addressDefaults,
                            fields: { phone: "never" },
                            autocomplete: { mode: "automatic" },
                        }}
                    />
                    <Field orientation="horizontal" className="items-start gap-2">
                        <Checkbox
                            id={useAsPrimaryId}
                            checked={useAsPrimary}
                            onCheckedChange={(v) => setUseAsPrimary(v === true)}
                            className="mt-0.5"
                        />
                        <FieldLabel
                            htmlFor={useAsPrimaryId}
                            className="cursor-pointer font-normal text-ds-fg text-sm"
                        >
                            Use this billing address as my organization's primary address
                        </FieldLabel>
                    </Field>
                    {submitError && (
                        <div className="flex items-start gap-2 rounded-md bg-ds-danger-soft p-3">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ds-danger-text" />
                            <p className="text-ds-danger-text text-sm">{submitError}</p>
                        </div>
                    )}
                </div>
            </DialogBody>
            <DialogFooter>
                {onBack ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        radius="full"
                        disabled={isBusy}
                        onClick={onBack}
                    >
                        Back
                    </Button>
                ) : (
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            radius="full"
                            disabled={isBusy}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                )}
                <Button
                    type="button"
                    size="md"
                    radius="full"
                    disabled={isBusy}
                    onClick={handleConfirm}
                >
                    {isBusy && isProcessing ? (
                        <>
                            <Spinner className="mr-2" />
                            Saving...
                        </>
                    ) : (
                        primaryLabel
                    )}
                </Button>
            </DialogFooter>
        </>
    )
}
