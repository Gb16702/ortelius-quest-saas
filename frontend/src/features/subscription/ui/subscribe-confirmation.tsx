import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import { TriangleAlert } from "lucide-react"
import { useState } from "react"
// TODO_i18n_review: Subscribe confirmation copy ("Subscribe to <plan>",
// "Welcome to <plan>", payment errors) remains English; translations exist
// under settings.json subscription.subscribe.* — deferred to a focused pass.
import { useOrg } from "@/entities/organization"
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Spinner } from "@/shared/ui/spinner"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useConfirmSubscribe, useSubscribe } from "../api/subscription.mutations"
import { stripePromise } from "../lib/stripe"
import { STRIPE_APPEARANCE } from "../lib/stripe-appearance"

interface SubscribeConfirmationProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    priceId: string
    planDisplayName: string
    amount: number
    currency: string
    organizationId: string
    onSuccess: () => void
}

export function SubscribeConfirmation({
    open,
    onOpenChange,
    priceId,
    planDisplayName,
    amount,
    currency,
    organizationId,
    onSuccess,
}: SubscribeConfirmationProps) {
    const elementsOptions: StripeElementsOptions = {
        mode: "subscription",
        amount,
        currency,
        paymentMethodTypes: ["card", "sepa_debit"],
        appearance: STRIPE_APPEARANCE,
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent className="z-[70] max-h-[calc(100vh-4rem)]" overlayClassName="z-[70]">
                <DialogHeader className="border-b">
                    <DialogTitle>Subscribe to {planDisplayName}</DialogTitle>
                </DialogHeader>

                <Elements stripe={stripePromise} options={elementsOptions}>
                    <SubscribePaymentForm
                        priceId={priceId}
                        planDisplayName={planDisplayName}
                        organizationId={organizationId}
                        onSuccess={onSuccess}
                    />
                </Elements>
            </DialogContent>
        </Dialog>
    )
}

interface SubscribePaymentFormProps {
    priceId: string
    planDisplayName: string
    organizationId: string
    onSuccess: () => void
}

function SubscribePaymentForm({
    priceId,
    planDisplayName,
    organizationId,
    onSuccess,
}: SubscribePaymentFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const subscribe = useSubscribe()
    const confirmSubscribe = useConfirmSubscribe(organizationId)
    const { meta } = useOrg()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

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

        let clientSecret: string
        let subscriptionId: string
        try {
            const result = await subscribe.mutateAsync(priceId)
            clientSecret = result.clientSecret
            subscriptionId = result.subscriptionId
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Couldn't start your subscription.")
            setIsProcessing(false)
            return
        }

        const { error: confirmError } = await stripe.confirmPayment({
            elements,
            clientSecret,
            redirect: "if_required",
            confirmParams: {
                return_url: `${window.location.origin}/org/${meta.slug}/settings/billing`,
            },
        })

        if (confirmError) {
            setSubmitError(confirmError.message ?? "Payment failed. Please try again.")
            setIsProcessing(false)
            return
        }

        const finalSubscriptionId = subscriptionId
        const runConfirm = () => {
            confirmSubscribe.mutate(finalSubscriptionId, {
                onSuccess: () => {
                    showSuccessToast(`Welcome to ${planDisplayName}`)
                    onSuccess()
                },
                onError: (err) => {
                    setIsProcessing(false)
                    showRetryErrorToast(err.message, { onRetry: runConfirm })
                },
            })
        }
        runConfirm()
    }

    const isBusy = isProcessing || confirmSubscribe.isPending || !stripe || !elements

    return (
        <>
            <DialogBody className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                    <PaymentElement
                        options={{
                            layout: { type: "tabs" },
                            terms: { card: "never", paypal: "never" },
                        }}
                    />
                    {submitError && (
                        <div className="flex items-start gap-2 rounded-md bg-ds-danger-soft p-3">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ds-danger-text" />
                            <p className="text-ds-danger-text text-sm">{submitError}</p>
                        </div>
                    )}
                </div>
            </DialogBody>
            <DialogFooter>
                <DialogClose asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        radius="full"
                        disabled={isBusy}
                    >
                        Cancel
                    </Button>
                </DialogClose>
                <Button
                    type="button"
                    size="lg"
                    radius="full"
                    disabled={isBusy}
                    onClick={handleConfirm}
                >
                    {isProcessing || confirmSubscribe.isPending ? (
                        <>
                            <Spinner className="mr-2" />
                            Processing...
                        </>
                    ) : (
                        `Subscribe to ${planDisplayName}`
                    )}
                </Button>
            </DialogFooter>
        </>
    )
}
