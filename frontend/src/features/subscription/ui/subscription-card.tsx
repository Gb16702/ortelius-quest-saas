import { useState } from "react"
import { useTranslation } from "react-i18next"
// TODO_i18n_review: SubscriptionCard contains complex composed strings (trial copy,
// pending plan change copy, price + interval formatting) that need broader product
// review for tone consistency in fr/es/nl/vi — minimum surface translated below.
import { useOrg } from "@/entities/organization"
import type { Plan } from "@/entities/subscription"
import { cn } from "@/shared/lib/class-names"
import { useIdlePreload } from "@/shared/lib/performance/use-idle-preload"
import { Button } from "@/shared/ui/button"
import { Card } from "@/shared/ui/card"
import { Note } from "@/shared/ui/note"
import { Skeleton } from "@/shared/ui/skeleton"
import { Spinner } from "@/shared/ui/spinner"
import { ToastPill } from "@/shared/ui/toast-pill"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useCurrentSubscription, usePaymentMethod, usePlans } from "../api/subscription.api"
import { useCancelPendingChange, useResumeSubscription } from "../api/subscription.mutations"
import { CARD_BRAND_LABELS } from "../lib/payment-brand"
import { type DeltaFeature, getVisibleDeltaFeatures } from "../lib/plan-selection"
import { getQueryErrorMessage } from "../lib/query-error"
import {
    findCheapestPlan,
    formatPriceDisplay,
    formatStartingPrice,
    formatSubscriptionDate,
    formatSubscriptionShortDate,
    resolveCurrentBillingInterval,
    resolveTrialState,
} from "../lib/subscription-summary"
import type { BillingInterval, PaymentMethod } from "../model/subscription"
import { BrandLogo } from "./payment-brand-logo"
import { PlanSelectionOverlay } from "./plan-selection-overlay"
import { preloadPlanSelectionOverlayContent } from "./plan-selection-overlay-preload"
import { UpdatePaymentMethodDialog } from "./update-payment-method-dialog"
import { preloadUpdatePaymentMethodDialogContent } from "./update-payment-method-dialog-preload"

interface SubscriptionCardProps {
    intentBillingInterval?: BillingInterval
    autoOpenManage?: boolean
}

// FIXME: refactor pending
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
export function SubscriptionCard({
    intentBillingInterval,
    autoOpenManage = false,
}: SubscriptionCardProps = {}) {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const [overlayOpen, setOverlayOpen] = useState(autoOpenManage)
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const { state } = useOrg()
    const organizationId = state.org.id

    const subscriptionQuery = useCurrentSubscription(organizationId)
    const plansQuery = usePlans()
    const paymentMethodQuery = usePaymentMethod(organizationId)
    const {
        data: subscription,
        error: subscriptionError,
        isLoading: isSubscriptionLoading,
        refetch: refetchSubscription,
    } = subscriptionQuery
    const {
        data: plansData,
        error: plansError,
        isLoading: arePlansLoading,
        refetch: refetchPlans,
    } = plansQuery
    const {
        data: paymentMethodData,
        error: paymentMethodError,
        isLoading: isPaymentMethodLoading,
        refetch: refetchPaymentMethod,
    } = paymentMethodQuery
    const resumeMutation = useResumeSubscription(organizationId)
    const cancelPendingMutation = useCancelPendingChange(organizationId)
    const planSelectionPreload = useIdlePreload(preloadPlanSelectionOverlayContent, {
        enabled: !isSubscriptionLoading && !arePlansLoading,
    })
    const paymentMethodDialogPreload = useIdlePreload(preloadUpdatePaymentMethodDialogContent, {
        enabled: !isSubscriptionLoading && !isPaymentMethodLoading,
    })

    const openPlanSelectionOverlay = () => {
        void planSelectionPreload.preload()
        setOverlayOpen(true)
    }

    const openPaymentDialog = () => {
        void paymentMethodDialogPreload.preload()
        setPaymentDialogOpen(true)
    }

    if (isSubscriptionLoading || arePlansLoading || isPaymentMethodLoading) {
        return <SubscriptionCardSkeleton />
    }

    if (!subscription || !plansData || !paymentMethodData) {
        return (
            <Card className="flex min-h-32 items-center justify-center p-6">
                <ToastPill
                    variant="error"
                    message={getQueryErrorMessage(
                        subscriptionError ?? plansError ?? paymentMethodError,
                        t("subscription.card.loadError")
                    )}
                    action={{
                        label: tCommon("action.retry"),
                        onClick: () => {
                            void refetchSubscription()
                            void refetchPlans()
                            void refetchPaymentMethod()
                        },
                    }}
                    onDismiss={() => undefined}
                />
            </Card>
        )
    }

    if (!subscription.hasActiveSubscription) {
        const cheapestPlan = findCheapestPlan(plansData?.plans)
        const trialEnded = subscription?.hasUsedTrial ?? false
        return (
            <>
                <NoPlanCard
                    cheapestPlan={cheapestPlan}
                    trialEnded={trialEnded}
                    onChoosePlan={openPlanSelectionOverlay}
                    onChoosePlanIntent={() => void planSelectionPreload.preload()}
                />

                {overlayOpen && (
                    <PlanSelectionOverlay
                        open
                        onClose={() => setOverlayOpen(false)}
                        currentPlanKey={null}
                        organizationId={organizationId}
                        initialBillingInterval={intentBillingInterval}
                    />
                )}
            </>
        )
    }

    const currentPlanKey = subscription.plan
    const currentPlan = plansData?.plans.find((p) => p.name === currentPlanKey)
    const features = currentPlan ? getVisibleDeltaFeatures(currentPlan) : []
    const planDisplayName = currentPlan?.displayName ?? t("subscription.card.subscriptionFallback")
    const billingInterval = resolveCurrentBillingInterval(subscription, currentPlan)
    const priceDisplay = currentPlan ? formatPriceDisplay(currentPlan, billingInterval) : null
    const paymentMethod = paymentMethodData.paymentMethod

    const canceled = subscription.cancelAtPeriodEnd
    const formattedCancelDate = formatSubscriptionDate(subscription.cancelsAt)
    const pendingPlanChange = subscription.pendingPlanChange
    const formattedPendingDate = formatSubscriptionDate(pendingPlanChange?.effectiveAt ?? null)
    const trial = resolveTrialState(subscription)
    const planBillingDate =
        trial && !paymentMethod
            ? subscription.trialEnd
            : subscription.nextBillingDate || subscription.trialEnd
    const formattedPlanBillingDate = formatSubscriptionShortDate(planBillingDate)
    const planBillingLabel = formattedPlanBillingDate
        ? `${trial && !paymentMethod ? "Trial ends" : "Next billing on"} ${formattedPlanBillingDate}`
        : null

    const handleResume = () => {
        resumeMutation.mutate(undefined, {
            onSuccess: () => showSuccessToast(t("subscription.toast.resumed")),
            onError: (err) => showRetryErrorToast(err.message, { onRetry: () => handleResume() }),
        })
    }

    const handleCancelPending = () => {
        cancelPendingMutation.mutate(undefined, {
            onSuccess: () => showSuccessToast(t("subscription.toast.pendingCanceled")),
            onError: (err) =>
                showRetryErrorToast(err.message, { onRetry: () => handleCancelPending() }),
        })
    }

    return (
        <>
            <div className="overflow-hidden rounded-xl bg-ds-surface-muted p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] shadow-dashboard-card">
                <div className="grid grid-cols-1 overflow-hidden rounded-lg bg-ds-surface shadow-dashboard-card md:grid-cols-2">
                    <section className="flex min-h-[144px] flex-col justify-between gap-8 border-ds-surface-border border-b p-4 md:border-r md:border-b-0">
                        <div className="flex flex-col gap-2">
                            <p className="font-medium text-ds-fg-muted text-sm">
                                {trial ? t("subscription.card.freeTrial") : "Plan"}
                            </p>
                            <div className="flex flex-col gap-2">
                                <h2 className="font-semibold text-base text-ds-fg tracking-tight">
                                    {planDisplayName}
                                </h2>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                            {priceDisplay && (
                                <p className="text-xs">
                                    <span className="font-medium text-ds-fg">
                                        {priceDisplay.amount}
                                    </span>
                                    <span className="text-ds-fg-muted">
                                        {" "}
                                        / {priceDisplay.intervalLabel}
                                    </span>
                                </p>
                            )}
                            {planBillingLabel && (
                                <p className="text-ds-fg-muted text-xs">{planBillingLabel}</p>
                            )}
                        </div>
                    </section>

                    <section
                        className={cn(
                            "flex min-h-[144px] flex-col justify-between gap-8 p-4",
                            !paymentMethod && "gap-6"
                        )}
                    >
                        <div className="flex flex-col gap-2">
                            <p className="font-medium text-ds-fg-muted text-sm">
                                {t("billing.title")}
                            </p>
                            {paymentMethod && <PaymentSummary paymentMethod={paymentMethod} />}
                            {!paymentMethod && (
                                <h2 className="font-semibold text-base text-ds-fg tracking-tight">
                                    {t("paymentMethod.emptyShortTitle", {
                                        defaultValue: "No payment method",
                                    })}
                                </h2>
                            )}
                        </div>

                        {!paymentMethod && (
                            <Button
                                variant="outline"
                                size="md"
                                radius="full"
                                onClick={openPaymentDialog}
                                onFocus={() => void paymentMethodDialogPreload.preload()}
                                onPointerDown={() => void paymentMethodDialogPreload.preload()}
                                onPointerEnter={() => void paymentMethodDialogPreload.preload()}
                                className="w-fit"
                            >
                                {t("paymentMethod.addAction")}
                            </Button>
                        )}
                    </section>
                </div>

                <div className="flex flex-col gap-8 px-5 py-8">
                    <FeatureList
                        features={features}
                        title={t("subscription.card.planIncludes", {
                            defaultValue: "Your plan includes",
                        })}
                        emptyLabel={t("subscription.card.noFeatures")}
                    />

                    {canceled ? (
                        resumeMutation.isPending ? (
                            <Note
                                type="warning"
                                label={false}
                                customIcon={<Spinner className="size-4 text-ds-amber-900" />}
                                className="mt-2 items-center"
                            >
                                Resuming plan...
                            </Note>
                        ) : (
                            <Note type="warning" label={false} className="mt-2 items-center">
                                Your plan ends on {formattedCancelDate ?? "your next billing date"}.{" "}
                                <button
                                    type="button"
                                    onClick={handleResume}
                                    className="cursor-pointer font-medium underline underline-offset-2 hover:text-ds-amber-1000"
                                >
                                    Resume plan
                                </button>
                            </Note>
                        )
                    ) : pendingPlanChange ? (
                        cancelPendingMutation.isPending ? (
                            <Note
                                type="info"
                                label={false}
                                customIcon={<Spinner className="size-4 text-ds-accent-700" />}
                                className="mt-2 items-center"
                            >
                                Keeping {planDisplayName}...
                            </Note>
                        ) : (
                            <Note type="info" label={false} className="mt-2 items-center">
                                Your plan changes to {pendingPlanChange.newPlan} on{" "}
                                {formattedPendingDate ?? "your next billing date"}.{" "}
                                <button
                                    type="button"
                                    onClick={handleCancelPending}
                                    className="cursor-pointer font-medium underline underline-offset-2 hover:text-ds-accent-1000"
                                >
                                    Keep {planDisplayName}
                                </button>
                            </Note>
                        )
                    ) : null}
                </div>

                <div className="flex px-5 pb-4">
                    <Button
                        variant="solid"
                        size="md"
                        radius="full"
                        disabled={canceled}
                        onClick={openPlanSelectionOverlay}
                        onFocus={() => void planSelectionPreload.preload()}
                        onPointerDown={() => void planSelectionPreload.preload()}
                        onPointerEnter={() => void planSelectionPreload.preload()}
                    >
                        Manage plan
                    </Button>
                </div>
            </div>

            {overlayOpen && (
                <PlanSelectionOverlay
                    open
                    onClose={() => setOverlayOpen(false)}
                    currentPlanKey={currentPlanKey}
                    organizationId={organizationId}
                    initialBillingInterval={intentBillingInterval}
                />
            )}

            {paymentDialogOpen && (
                <UpdatePaymentMethodDialog
                    open
                    onOpenChange={setPaymentDialogOpen}
                    mode="add"
                    organizationId={organizationId}
                />
            )}
        </>
    )
}

function PaymentSummary({ paymentMethod }: { paymentMethod: PaymentMethod }) {
    if (paymentMethod.type === "card") {
        const brandLabel =
            CARD_BRAND_LABELS[paymentMethod.brand] ??
            paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)
        const expiry =
            paymentMethod.expMonth && paymentMethod.expYear
                ? `${paymentMethod.expMonth.toString().padStart(2, "0")}/${paymentMethod.expYear.toString().slice(-2)}`
                : null

        return (
            <div className="flex flex-col gap-8">
                <div className="flex min-w-0 items-center gap-3">
                    <h2 className="truncate font-semibold text-2xl text-ds-fg tracking-tight">
                        {brandLabel} {paymentMethod.last4}
                    </h2>
                    <div className="size-6 shrink-0 overflow-hidden rounded-full">
                        <BrandLogo brand={paymentMethod.brand} className="h-full w-full" />
                    </div>
                </div>
                {expiry && <p className="text-ds-fg-muted text-sm">Expires on {expiry}</p>}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <h2 className="font-semibold text-2xl text-ds-fg tracking-tight">SEPA Direct Debit</h2>
            <p className="font-mono text-ds-fg-muted text-sm">•••• {paymentMethod.last4}</p>
        </div>
    )
}

function FeatureList({
    features,
    title,
    emptyLabel,
}: {
    features: DeltaFeature[]
    title: string
    emptyLabel: string
}) {
    if (features.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <h3 className="font-medium text-ds-fg-muted text-sm">{title}</h3>
                <p className="text-ds-fg-muted text-sm">{emptyLabel}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h3 className="font-medium text-ds-fg-muted text-sm">{title}</h3>
            <ul className="space-y-7">
                {features.map((feature) => (
                    <li key={feature.key} className="flex items-center">
                        <span className="min-w-0 text-ds-fg text-sm">{feature.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

interface NoPlanCardProps {
    cheapestPlan: Plan | undefined
    trialEnded: boolean
    onChoosePlan: () => void
    onChoosePlanIntent: () => void
}

function NoPlanCard({
    cheapestPlan,
    trialEnded,
    onChoosePlan,
    onChoosePlanIntent,
}: NoPlanCardProps) {
    const priceLabel = cheapestPlan ? formatStartingPrice(cheapestPlan) : null

    const eyebrow = trialEnded ? "Trial ended" : "No active plan"
    const heading = trialEnded ? "Subscribe to continue" : "Pick a plan to get started"
    const ctaLabel = trialEnded ? "Subscribe" : "Choose a plan"

    return (
        <Card className="!flex-row !gap-6 items-center justify-between px-7 py-6">
            <div>
                <p className="font-semibold text-[11px] text-ds-fg-muted uppercase tracking-[0.06em]">
                    {eyebrow}
                </p>
                <h2 className="mt-2 mb-1 font-semibold text-ds-fg text-lg tracking-tight">
                    {heading}
                </h2>
                <p className="text-[13.5px] text-ds-fg-muted">
                    {priceLabel
                        ? `${cheapestPlan?.displayName} from ${priceLabel}/mo · upgrade or downgrade anytime.`
                        : "Upgrade or downgrade anytime."}
                </p>
            </div>
            <Button
                variant="solid"
                radius="full"
                size="md"
                onClick={onChoosePlan}
                onFocus={onChoosePlanIntent}
                onPointerDown={onChoosePlanIntent}
                onPointerEnter={onChoosePlanIntent}
                className="shrink-0"
            >
                {ctaLabel}
            </Button>
        </Card>
    )
}

function SubscriptionCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-lg border border-ds-surface-border bg-ds-surface">
            <div className="grid grid-cols-1 border-ds-surface-border border-b md:grid-cols-2">
                {[0, 1].map((panel) => (
                    <div
                        key={panel}
                        className={cn(
                            "flex min-h-[188px] flex-col justify-between gap-8 p-6 md:p-7",
                            panel === 0 &&
                                "border-ds-surface-border border-b md:border-r md:border-b-0"
                        )}
                    >
                        <div className="flex flex-col gap-4">
                            <Skeleton className="h-4 w-16" />
                            <div className="flex flex-col gap-2">
                                <Skeleton className="h-7 w-40" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-44" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-5 p-6 md:p-7">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="overflow-hidden rounded-lg border border-ds-surface-border">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static skeleton rows
                            key={i}
                            className={cn(
                                "flex min-h-12 items-center justify-between gap-4 px-4 py-3",
                                i < 7 && "border-ds-surface-border border-b"
                            )}
                        >
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="border-ds-surface-border border-t bg-ds-canvas px-6 py-4 md:px-7">
                <Skeleton className="h-9 w-24 rounded-full" />
            </div>
        </div>
    )
}
