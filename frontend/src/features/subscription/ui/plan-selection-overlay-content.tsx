// TODO_i18n_review: plan-selection overlay copy (Current / Recommended badges,
// "Save €X per user", "Everything in X, and:", per-user/month, "Billed yearly/monthly",
// CTA labels driven by getPlanActionLabel) remains in English. Translations exist
// under settings.json subscription.planSelection.* — wiring deferred to a focused
// follow-up to validate against plan-pricing copy and per-user/month conventions.
import { Check } from "lucide-react"
import type { Plan } from "@/entities/subscription"
import { FEATURE_ICON_NAMES } from "@/entities/subscription"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { NamedIcon } from "@/shared/ui/icons/named-icon"
import { Spinner } from "@/shared/ui/spinner"
import { Switch } from "@/shared/ui/switch"
import { usePlans } from "../api/subscription.api"
import {
    getAnnualSavings,
    getPlanActionLabel,
    getPlanDisplayAmount,
    getVisibleDeltaFeatures,
    isRecommendedPlan,
} from "../lib/plan-selection"
import { usePlanSelection } from "../model/hooks/use-plan-selection"
import type { BillingInterval, PlanKey } from "../model/subscription"
import { PlanChangeConfirmation } from "./plan-change-confirmation"
import { PlanSelectionOverlaySkeleton } from "./plan-selection-overlay-skeleton"
import { SubscribeConfirmation } from "./subscribe-confirmation"

interface PlanSelectionOverlayContentProps {
    onClose: () => void
    currentPlanKey: PlanKey | null
    organizationId: string
    initialBillingInterval?: BillingInterval
}

export function PlanSelectionOverlayContent({
    onClose,
    currentPlanKey,
    organizationId,
    initialBillingInterval = "monthly",
}: PlanSelectionOverlayContentProps) {
    const { data: plansData, isLoading } = usePlans()

    const plans = plansData?.plans ?? []
    const {
        billingInterval,
        setBillingInterval,
        pendingPriceId,
        setPendingPriceId,
        subscribePriceId,
        setSubscribePriceId,
        subscribePlan,
        subscribePlanPrice,
        pendingDirection,
        handleSelect,
    } = usePlanSelection({
        plans,
        currentPlanKey,
        initialBillingInterval,
    })

    return (
        <>
            {isLoading ? (
                <PlanSelectionOverlaySkeleton />
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {plans.map((plan, index) => (
                        <PlanCard
                            key={plan.name}
                            plan={plan}
                            previousPlan={index > 0 ? plans[index - 1] : null}
                            billingInterval={billingInterval}
                            onBillingIntervalChange={setBillingInterval}
                            currentPlanKey={currentPlanKey}
                            onSelect={handleSelect}
                            isPending={false}
                        />
                    ))}
                </div>
            )}

            {pendingPriceId && (
                <PlanChangeConfirmation
                    open
                    onOpenChange={(next) => {
                        if (!next) setPendingPriceId(null)
                    }}
                    priceId={pendingPriceId}
                    direction={pendingDirection}
                    organizationId={organizationId}
                    onSuccess={() => {
                        setPendingPriceId(null)
                        onClose()
                    }}
                />
            )}

            {subscribePriceId && subscribePlan && subscribePlanPrice && (
                <SubscribeConfirmation
                    open
                    onOpenChange={(next) => {
                        if (!next) setSubscribePriceId(null)
                    }}
                    priceId={subscribePriceId}
                    planDisplayName={subscribePlan.displayName}
                    amount={Math.round(subscribePlanPrice.amount * 100)}
                    currency={subscribePlanPrice.currency.toLowerCase()}
                    organizationId={organizationId}
                    onSuccess={() => {
                        setSubscribePriceId(null)
                        onClose()
                    }}
                />
            )}
        </>
    )
}

interface PlanCardProps {
    plan: Plan
    previousPlan: Plan | null
    billingInterval: BillingInterval
    onBillingIntervalChange: (next: BillingInterval) => void
    currentPlanKey: PlanKey | null
    onSelect: (priceId: string) => void
    isPending?: boolean
}

function PlanCard({
    plan,
    previousPlan,
    billingInterval,
    onBillingIntervalChange,
    currentPlanKey,
    onSelect,
    isPending = false,
}: PlanCardProps) {
    const displayAmount = getPlanDisplayAmount(plan, billingInterval)
    const targetPriceId = plan.priceIds[billingInterval]

    const isCurrentPlan = currentPlanKey === plan.name
    const isRecommended = isRecommendedPlan(plan.name)

    const actionLabel = getPlanActionLabel({ plan, currentPlanKey })
    const savings = getAnnualSavings(plan)

    const buttonVariant: "brand" | "outline" = isRecommended ? "brand" : "outline"

    return (
        <div
            className={cn(
                "flex h-full flex-col rounded-lg border p-6",
                isRecommended
                    ? "border-ds-blue-700/40 bg-ds-surface bg-gradient-to-b from-0% from-ds-blue-700/10 to-30% to-transparent"
                    : isCurrentPlan
                      ? "border-ds-blue-700 bg-ds-surface"
                      : "border-ds-surface-border bg-ds-surface"
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium text-ds-fg text-xl">{plan.displayName}</h2>
                {isCurrentPlan && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ds-blue-700 px-2 py-0.5 font-medium text-white text-xs">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Current
                    </span>
                )}
                {!isCurrentPlan && isRecommended && (
                    <span className="shrink-0 rounded-full bg-ds-blue-700 px-2 py-0.5 font-medium text-white text-xs">
                        Recommended
                    </span>
                )}
            </div>

            <div className="mt-4 flex items-baseline gap-2">
                <span className="font-semibold text-4xl text-ds-fg">€{displayAmount}</span>
                <span className="text-ds-fg-muted text-sm">
                    per user / <span className="text-ds-fg">month</span>
                </span>
            </div>

            <p className="mt-2 text-ds-fg-muted text-sm">{plan.tagline}</p>

            <div className="-mx-6 mt-5 flex items-center justify-between gap-3 border-ds-surface-border border-y px-6 py-3">
                <div className="flex items-center gap-3">
                    <Switch
                        checked={billingInterval === "annual"}
                        onCheckedChange={(checked) =>
                            onBillingIntervalChange(checked ? "annual" : "monthly")
                        }
                        className="data-[state=checked]:border-ds-blue-700 data-[state=checked]:bg-ds-blue-700"
                    />
                    <span className="text-ds-fg-muted text-sm">
                        {billingInterval === "annual" ? "Billed yearly" : "Billed monthly"}
                    </span>
                </div>
                {billingInterval === "annual" && savings > 0 && (
                    <span className="text-ds-fg-muted text-sm">Save €{savings} per user</span>
                )}
            </div>

            <div className="mt-6 flex-1">
                {previousPlan && (
                    <p className="mb-4 font-medium text-ds-fg text-sm">
                        Everything in {previousPlan.displayName}, and:
                    </p>
                )}
                <ul className="space-y-5">
                    {getVisibleDeltaFeatures(plan).map((feature) => {
                        const iconName = FEATURE_ICON_NAMES[feature.key]
                        return (
                            <li
                                key={feature.key}
                                className="flex items-center gap-2.5 text-ds-fg text-sm"
                            >
                                <NamedIcon name={iconName} className="size-4 text-ds-blue-700" />
                                <span>{feature.label}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>

            {!isCurrentPlan && (
                <Button
                    className="mt-6 w-full"
                    variant={buttonVariant}
                    size="lg"
                    radius="full"
                    disabled={isPending}
                    onClick={() => onSelect(targetPriceId)}
                >
                    {isPending ? <Spinner /> : actionLabel}
                </Button>
            )}
        </div>
    )
}
