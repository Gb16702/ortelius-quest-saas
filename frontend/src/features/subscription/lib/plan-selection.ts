import type { FeatureKey, Plan, PlanFeature, PlanKey } from "@/entities/subscription"
import { PLAN_HIGHLIGHTS, YEARLY_DISCOUNT } from "@/entities/subscription"
import type { BillingInterval } from "../model/subscription"

const PLAN_TIER_ORDER: Record<PlanKey, number> = {
    starter: 1,
    professional: 2,
    enterprise: 3,
}

const RECOMMENDED_PLAN_KEY: PlanKey = "professional"
export const PLAN_CARD_FEATURE_LIMIT = 6

export interface DeltaFeature {
    key: FeatureKey
    label: string
}

export type PlanChangeDirection = "upgrade" | "downgrade"

export function getDeltaFeatures(plan: Plan): DeltaFeature[] {
    const featureByKey = new Map<string, PlanFeature>(
        plan.features.map((feature) => [feature.key, feature])
    )
    const result: DeltaFeature[] = []

    for (const key of PLAN_HIGHLIGHTS[plan.name]) {
        const feature = featureByKey.get(key)
        if (feature?.included) result.push({ key, label: feature.label })
    }

    return result
}

export function getVisibleDeltaFeatures(plan: Plan): DeltaFeature[] {
    return getDeltaFeatures(plan).slice(0, PLAN_CARD_FEATURE_LIMIT)
}

export function isRecommendedPlan(planKey: PlanKey): boolean {
    return planKey === RECOMMENDED_PLAN_KEY
}

export function findPlanByPriceId(plans: readonly Plan[], priceId: string | null): Plan | null {
    if (!priceId) return null
    return (
        plans.find(
            (plan) => plan.priceIds.monthly === priceId || plan.priceIds.annual === priceId
        ) ?? null
    )
}

export function resolveBillingIntervalForPrice(
    plan: Plan | null,
    priceId: string | null
): BillingInterval | null {
    if (!plan || !priceId) return null
    return plan.priceIds.monthly === priceId ? "monthly" : "annual"
}

export function resolvePlanChangeDirection({
    plans,
    currentPlanKey,
    priceId,
}: {
    plans: readonly Plan[]
    currentPlanKey: PlanKey | null
    priceId: string | null
}): PlanChangeDirection {
    if (!priceId || !currentPlanKey) return "upgrade"

    const targetPlan = findPlanByPriceId(plans, priceId)
    if (!targetPlan) return "upgrade"

    return PLAN_TIER_ORDER[targetPlan.name] > PLAN_TIER_ORDER[currentPlanKey]
        ? "upgrade"
        : "downgrade"
}

export function getPlanDisplayAmount(plan: Plan, interval: BillingInterval): number {
    const monthlyAmount = plan.prices.monthly.amount
    return interval === "annual"
        ? Math.floor(monthlyAmount * (1 - YEARLY_DISCOUNT))
        : Math.floor(monthlyAmount)
}

export function getAnnualSavings(plan: Plan): number {
    return Math.floor(plan.prices.monthly.amount * YEARLY_DISCOUNT) * 12
}

export function getPlanActionLabel({
    plan,
    currentPlanKey,
}: {
    plan: Plan
    currentPlanKey: PlanKey | null
}): string {
    if (!currentPlanKey) return `Subscribe to ${plan.displayName}`

    return PLAN_TIER_ORDER[plan.name] > PLAN_TIER_ORDER[currentPlanKey]
        ? `Upgrade to ${plan.displayName}`
        : `Downgrade to ${plan.displayName}`
}
