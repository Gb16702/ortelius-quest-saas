import * as v from "valibot"

export const planFeatureSchema = v.object({
    key: v.string(),
    label: v.string(),
    included: v.boolean(),
})

const planPriceSchema = v.object({
    amount: v.number(),
    currency: v.string(),
})

// Backend may return singular fields (priceId, price, limits)
// alongside the canonical plural shape. Valibot's default `object` drops
// them — do not switch to .strict() (would throw) or .passthrough()
// (would leak typed-as-`unknown` fields into consumers).
export const planSchema = v.object({
    name: v.picklist(["starter", "professional", "enterprise"]),
    displayName: v.string(),
    tagline: v.string(),
    priceIds: v.object({
        monthly: v.string(),
        annual: v.string(),
    }),
    prices: v.object({
        monthly: planPriceSchema,
        annual: planPriceSchema,
    }),
    features: v.array(planFeatureSchema),
    freeTrial: v.object({ days: v.number() }),
})

export const plansResponseSchema = v.object({
    plans: v.array(planSchema),
})

export type PlanFeature = v.InferOutput<typeof planFeatureSchema>
export type Plan = v.InferOutput<typeof planSchema>
export type PlansResponse = v.InferOutput<typeof plansResponseSchema>

export type PlanKey = Plan["name"]

// Frontend-only narrowing of feature keys for typing presentation maps.
// The Valibot schema keeps `feature.key` as `v.string()` so backend additions
// don't break the SSR loader; tightening to `v.picklist` is a follow-up once
// the backend feature catalog is audited.
export type FeatureKey =
    | "unlimitedRequests"
    | "quoteManagement"
    | "clientChat"
    | "branding"
    | "teamChat"
    | "voipCalls"
    | "callTranscription"
    | "activityLog"
    | "basicDashboard"
    | "colorThemes"
    | "advancedAnalytics"
    | "pricingIntelligence"

export const marketingCurrentSubscriptionSchema = v.object({
    plan: v.optional(v.nullable(v.string()), null),
    status: v.optional(v.nullable(v.string()), null),
    hasUsedTrial: v.optional(v.boolean(), false),
    hasActiveSubscription: v.optional(v.boolean(), false),
    hasOrganization: v.optional(v.boolean(), false),
    organization: v.optional(
        v.nullable(
            v.object({
                id: v.string(),
                name: v.string(),
                slug: v.string(),
                status: v.string(),
            })
        ),
        null
    ),
})

export type CurrentSubscription = v.InferOutput<typeof marketingCurrentSubscriptionSchema>

export interface CurrentSubscriptionOrganization {
    id: string
    name: string
    slug: string
    status: string
}
