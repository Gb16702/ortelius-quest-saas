import type { Plan, PlanFeature } from "@/entities/subscription"
import { getOrderedFeatureKeysForPlan } from "@/entities/subscription"
import type { BillingInterval, CurrentSubscription } from "../model/subscription"

const MS_PER_DAY = 1000 * 60 * 60 * 24
const TRIAL_ENDING_SOON_DAYS = 3

export interface TrialState {
    daysRemaining: number
    endLabel: string
    endingSoon: boolean
}

export function getOrderedIncludedFeatures(plan: Plan): PlanFeature[] {
    const featureByKey = new Map<string, PlanFeature>(
        plan.features.map((feature) => [feature.key, feature])
    )
    const result: PlanFeature[] = []

    for (const key of getOrderedFeatureKeysForPlan(plan.name)) {
        const feature = featureByKey.get(key)
        if (feature?.included) result.push(feature)
    }

    return result
}

export function resolveCurrentBillingInterval(
    subscription: CurrentSubscription,
    plan: Plan | undefined
): BillingInterval {
    if (!plan || !subscription.currentPriceId) return "monthly"
    if (plan.priceIds.annual === subscription.currentPriceId) return "annual"
    return "monthly"
}

export function formatPriceDisplay(
    plan: Plan,
    interval: BillingInterval
): { amount: string; intervalLabel: string } {
    const price = plan.prices[interval]

    return {
        amount: formatCurrencyAmount(price.amount, price.currency),
        intervalLabel: interval === "annual" ? "year" : "month",
    }
}

export function formatSubscriptionDate(value: string | null | undefined): string | null {
    if (!value) return null

    return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

export function formatSubscriptionShortDate(value: string | null | undefined): string | null {
    if (!value) return null

    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })
}

export function resolveTrialState(
    subscription: CurrentSubscription,
    now: number = Date.now()
): TrialState | null {
    if (subscription.status !== "trialing" || !subscription.trialEnd) return null

    const endTime = new Date(subscription.trialEnd).getTime()
    if (Number.isNaN(endTime)) return null

    const daysRemaining = Math.max(0, Math.ceil((endTime - now) / MS_PER_DAY))
    const endLabel = formatSubscriptionDate(subscription.trialEnd)
    if (!endLabel) return null

    return {
        daysRemaining,
        endLabel,
        endingSoon: daysRemaining <= TRIAL_ENDING_SOON_DAYS,
    }
}

export function findCheapestPlan(plans: readonly Plan[] | undefined): Plan | undefined {
    if (!plans || plans.length === 0) return undefined

    let cheapest = plans[0]
    for (const plan of plans) {
        if (plan.prices.monthly.amount < cheapest.prices.monthly.amount) {
            cheapest = plan
        }
    }

    return cheapest
}

export function formatStartingPrice(plan: Plan): string {
    return formatCurrencyAmount(plan.prices.monthly.amount, plan.prices.monthly.currency)
}

function formatCurrencyAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}
