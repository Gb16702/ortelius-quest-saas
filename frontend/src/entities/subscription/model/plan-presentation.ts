import type { FeatureKey, PlanKey } from "./subscription.schema"

export const YEARLY_DISCOUNT = 0.2

export type CategoryKey =
    | "coreFeatures"
    | "communication"
    | "customization"
    | "analytics"
    | "intelligence"

export const PLAN_HIGHLIGHTS: Record<PlanKey, FeatureKey[]> = {
    starter: ["unlimitedRequests", "quoteManagement", "clientChat", "branding"],
    professional: [
        "teamChat",
        "voipCalls",
        "callTranscription",
        "activityLog",
        "basicDashboard",
        "colorThemes",
    ],
    enterprise: ["advancedAnalytics", "pricingIntelligence"],
}

export const FEATURE_CATEGORIES: Record<CategoryKey, FeatureKey[]> = {
    coreFeatures: ["unlimitedRequests", "quoteManagement"],
    communication: ["clientChat", "teamChat", "voipCalls", "callTranscription"],
    customization: ["branding", "colorThemes"],
    analytics: ["basicDashboard", "advancedAnalytics", "activityLog"],
    intelligence: ["pricingIntelligence"],
}

const PLAN_TIER_ORDER: PlanKey[] = ["starter", "professional", "enterprise"]

// Cumulative ordered feature keys for a plan tier — Starter highlights, then
// Professional, then Enterprise. The frontend owns presentation order; backend
// owns entitlement (included true/false). Use this to render any surface that
// lists ALL included features for the active tier (e.g. SubscriptionCard).
export function getOrderedFeatureKeysForPlan(planName: PlanKey): FeatureKey[] {
    const tierIndex = PLAN_TIER_ORDER.indexOf(planName)
    return PLAN_TIER_ORDER.slice(0, tierIndex + 1).flatMap((name) => PLAN_HIGHLIGHTS[name])
}
