import type { FeatureKey, Plan } from "@/entities/subscription"

export function planHasFeature(plan: Plan, key: FeatureKey): boolean {
    return plan.features.some((feature) => feature.key === key && feature.included)
}
