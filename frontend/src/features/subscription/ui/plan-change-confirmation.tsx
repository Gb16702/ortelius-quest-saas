import { Elements } from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import { TriangleAlert } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
// TODO_i18n_review: plan-change preview (upgrade/downgrade prorated copy, formatDate,
// CompactPaymentMethod copy) is heavily English; translations exist under
// settings.json subscription.planChange.* — deferred to a focused pass.
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Skeleton } from "@/shared/ui/skeleton"
import { Spinner } from "@/shared/ui/spinner"
import { showErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useBillingAddress, usePlans } from "../api/subscription.api"
import { useChangePlan, usePreviewChange } from "../api/subscription.mutations"
import { brandNeedsBorder, CARD_BRAND_LABELS } from "../lib/payment-brand"
import { stripePromise } from "../lib/stripe"
import { STRIPE_APPEARANCE } from "../lib/stripe-appearance"
import type {
    PaymentMethod,
    PreviewChangeDowngrade,
    PreviewChangeResponse,
    PreviewChangeUpgrade,
} from "../model/subscription"
import { BrandLogo } from "./payment-brand-logo"
import { PaymentMethodForm } from "./update-payment-method-dialog"

interface PlanChangeConfirmationProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    priceId: string
    direction: "upgrade" | "downgrade"
    organizationId: string
    onSuccess: () => void
}

type View = "review" | "change-pm"

const elementsOptions: StripeElementsOptions = {
    mode: "setup",
    currency: "eur",
    paymentMethodTypes: ["card", "sepa_debit"],
    appearance: STRIPE_APPEARANCE,
}

export function PlanChangeConfirmation({
    open,
    onOpenChange,
    priceId,
    direction,
    organizationId,
    onSuccess,
}: PlanChangeConfirmationProps) {
    const previewMutation = usePreviewChange()
    const changeMutation = useChangePlan(organizationId)
    const [view, setView] = useState<View>("review")
    const { data: billingAddressData } = useBillingAddress(
        organizationId,
        open && view === "change-pm"
    )
    const currentAddress = billingAddressData?.address ?? null

    useEffect(() => {
        if (!open) return
        setView("review")
        previewMutation.mutate(priceId)
    }, [open, priceId, previewMutation.mutate])

    const handleConfirm = () => {
        changeMutation.mutate(priceId, {
            onSuccess: () => {
                showSuccessToast("Plan updated")
                onSuccess()
            },
            onError: (error) => {
                showErrorToast(error.message)
            },
        })
    }

    const handlePaymentMethodSaved = () => {
        setView("review")
        previewMutation.mutate(priceId)
    }

    const preview = previewMutation.data
    const isLoading = previewMutation.isPending
    const previewError = previewMutation.error
    const hasError = Boolean(previewError) && !isLoading

    const title = view === "change-pm" ? "Update payment method" : "Confirm plan changes"
    const description =
        view === "change-pm"
            ? "Update the payment method used for this organization subscription."
            : "Review how this plan change affects billing before confirming."

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogContent className="z-[70]" overlayClassName="z-[70]">
                <DialogHeader className="border-b">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">{description}</DialogDescription>
                </DialogHeader>

                {view === "review" ? (
                    <>
                        <DialogBody>
                            {isLoading &&
                                (direction === "downgrade" ? (
                                    <DowngradeSkeleton />
                                ) : (
                                    <UpgradeSkeleton />
                                ))}
                            {hasError && (
                                <PreviewErrorState
                                    message={previewError?.message}
                                    onRetry={() => previewMutation.mutate(priceId)}
                                    isRetrying={previewMutation.isPending}
                                />
                            )}
                            {!isLoading && !hasError && preview && (
                                <ConfirmationContent
                                    preview={preview}
                                    onChangePaymentMethod={() => setView("change-pm")}
                                />
                            )}
                        </DialogBody>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    radius="full"
                                    disabled={changeMutation.isPending}
                                >
                                    {hasError ? "Close" : "Cancel"}
                                </Button>
                            </DialogClose>
                            {!hasError && (
                                <Button
                                    size="lg"
                                    radius="full"
                                    disabled={!preview || isLoading || changeMutation.isPending}
                                    onClick={handleConfirm}
                                >
                                    {changeMutation.isPending ? (
                                        <>
                                            <Spinner className="mr-2" />
                                            {preview?.direction === "upgrade"
                                                ? "Processing..."
                                                : "Confirming..."}
                                        </>
                                    ) : preview?.direction === "downgrade" ? (
                                        "Confirm"
                                    ) : (
                                        "Pay now"
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                ) : (
                    <Elements stripe={stripePromise} options={elementsOptions}>
                        <PaymentMethodForm
                            mode="update"
                            organizationId={organizationId}
                            currentAddress={currentAddress}
                            onSuccess={handlePaymentMethodSaved}
                            onBack={() => setView("review")}
                        />
                    </Elements>
                )}
            </DialogContent>
        </Dialog>
    )
}

interface PreviewErrorStateProps {
    message: string | undefined
    onRetry: () => void
    isRetrying: boolean
}

function PreviewErrorState({ message, onRetry, isRetrying }: PreviewErrorStateProps) {
    return (
        <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ds-danger-soft">
                <TriangleAlert className="h-5 w-5 text-ds-danger-text" />
            </div>
            <p className="mt-4 font-medium text-ds-fg text-sm">
                We couldn't load the plan change details
            </p>
            <p className="mt-1 max-w-sm text-ds-fg-muted text-sm">
                {message ?? "Please try again in a moment."}
            </p>
            <Button
                variant="outline"
                size="sm"
                radius="full"
                className="mt-4"
                onClick={onRetry}
                disabled={isRetrying}
            >
                {isRetrying ? (
                    <>
                        <Spinner className="mr-2" />
                        Retrying...
                    </>
                ) : (
                    "Try again"
                )}
            </Button>
        </div>
    )
}

function ConfirmationContent({
    preview,
    onChangePaymentMethod,
}: {
    preview: PreviewChangeResponse
    onChangePaymentMethod: () => void
}) {
    if (preview.direction === "upgrade") {
        return <UpgradeContent preview={preview} onChangePaymentMethod={onChangePaymentMethod} />
    }
    return <DowngradeContent preview={preview} />
}

function UpgradeContent({
    preview,
    onChangePaymentMethod,
}: {
    preview: PreviewChangeUpgrade
    onChangePaymentMethod: () => void
}) {
    const intervalLabel = preview.billingInterval === "monthly" ? "month" : "year"

    return (
        <div className="space-y-3">
            <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-5">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-fg-muted">Prorated {preview.newPlan} plan</span>
                        <span className="text-ds-fg">€{preview.proratedNewCharge.toFixed(2)}</span>
                    </div>
                    {preview.adjustment < 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-ds-fg-muted">
                                Prorated credit for unused {preview.currentPlan} time
                            </span>
                            <span className="text-ds-fg">
                                −€{Math.abs(preview.adjustment).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
                <div className="mt-4 space-y-1 border-ds-surface-border border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-ds-fg">Due today</span>
                        <span className="font-semibold text-ds-fg">
                            €{preview.totalDueToday.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-ds-fg-muted text-sm">
                        Then €{preview.newPrice.toFixed(2)} / {intervalLabel} from{" "}
                        {formatDate(preview.nextBillingDate)}.
                    </p>
                </div>
            </div>

            {preview.paymentMethod && (
                <CompactPaymentMethod
                    paymentMethod={preview.paymentMethod}
                    onChange={onChangePaymentMethod}
                />
            )}
        </div>
    )
}

function CompactPaymentMethod({
    paymentMethod,
    onChange,
}: {
    paymentMethod: PaymentMethod
    onChange?: () => void
}) {
    if (paymentMethod.type === "sepa_debit") {
        return (
            <div className="flex items-center justify-between gap-4 rounded-sm border border-ds-surface-border bg-ds-surface px-4 py-3">
                <span className="text-ds-fg text-sm">
                    <span className="font-semibold">SEPA Direct Debit</span>{" "}
                    <span className="font-mono text-[13px]">•••• {paymentMethod.last4}</span>
                </span>
                {onChange && (
                    <Button variant="link" size="sm" onClick={onChange}>
                        Change
                    </Button>
                )}
            </div>
        )
    }

    const brandLabel =
        CARD_BRAND_LABELS[paymentMethod.brand] ??
        paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)
    const expiry =
        paymentMethod.expMonth && paymentMethod.expYear
            ? `${paymentMethod.expMonth.toString().padStart(2, "0")} / ${paymentMethod.expYear.toString().slice(-2)}`
            : null

    return (
        <div className="flex items-center justify-between gap-4 rounded-sm border border-ds-surface-border bg-ds-surface px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
                <div
                    className={`h-6 w-6 shrink-0 overflow-hidden rounded-sm${
                        brandNeedsBorder(paymentMethod.brand)
                            ? "border border-ds-surface-border"
                            : ""
                    }`}
                >
                    <BrandLogo brand={paymentMethod.brand} className="h-full w-full" />
                </div>
                <span className="text-ds-fg text-sm">
                    <span className="font-semibold">{brandLabel}</span>{" "}
                    <span className="font-mono text-[13px]">•••• {paymentMethod.last4}</span>
                    {expiry ? <> expires {expiry}</> : null}
                </span>
            </div>
            {onChange && (
                <Button variant="link" size="sm" onClick={onChange}>
                    Change
                </Button>
            )}
        </div>
    )
}

function DowngradeContent({ preview }: { preview: PreviewChangeDowngrade }) {
    const { data: plansData } = usePlans()
    const intervalLabel = preview.billingInterval === "monthly" ? "month" : "year"
    const formattedDate = formatDate(preview.nextBillingDate)
    const removedFeatures = useMemo(() => {
        const plans = plansData?.plans ?? []
        const currentPlan = plans.find((plan) => plan.name === preview.currentPlanKey)
        const newPlan = plans.find((plan) => plan.name === preview.newPlanKey)

        if (!currentPlan || !newPlan) return []

        const newPlanFeatureKeys = new Set(
            newPlan.features.filter((feature) => feature.included).map((feature) => feature.key)
        )

        return currentPlan.features
            .filter((feature) => feature.included && !newPlanFeatureKeys.has(feature.key))
            .map((feature) => feature.label)
    }, [plansData?.plans, preview.currentPlanKey, preview.newPlanKey])

    return (
        <div className="space-y-3">
            <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-5">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-ds-fg-muted">New {preview.newPlan} plan</span>
                    <span className="text-ds-fg">
                        €{preview.newPrice.toFixed(2)} / {intervalLabel}
                    </span>
                </div>
                <div className="mt-4 space-y-1 border-ds-surface-border border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-ds-fg">Effective from</span>
                        <span className="font-semibold text-ds-fg">{formattedDate}</span>
                    </div>
                    <p className="text-ds-fg-muted text-sm">
                        Your {preview.currentPlan} plan stays active until then. No charge today.
                    </p>
                </div>
            </div>

            {removedFeatures.length > 0 && (
                <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-5">
                    <p className="font-medium text-ds-fg text-sm">Features removed</p>
                    <ul className="mt-3 space-y-2">
                        {removedFeatures.map((feature) => (
                            <li key={feature} className="text-ds-fg-muted text-sm">
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

function UpgradeSkeleton() {
    return (
        <div className="space-y-3">
            <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-5">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
                <div className="mt-4 space-y-1 border-ds-surface-border border-t pt-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-56" />
                </div>
            </div>
            <div className="flex items-center justify-between rounded-sm border border-ds-surface-border bg-ds-surface px-4 py-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-10 rounded-sm" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
    )
}

function DowngradeSkeleton() {
    return (
        <div className="rounded-sm border border-ds-surface-border bg-ds-surface p-5">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="mt-4 space-y-2 border-ds-surface-border border-t pt-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-72" />
            </div>
        </div>
    )
}

function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}
