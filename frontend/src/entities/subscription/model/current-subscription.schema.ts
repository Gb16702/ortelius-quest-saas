import * as v from "valibot"

export const planKeySchema = v.picklist(["starter", "professional", "enterprise"])

export const billingIntervalSchema = v.picklist(["monthly", "annual"])

export const pendingPlanChangeSchema = v.object({
    newPlan: v.string(),
    newPlanKey: planKeySchema,
    newPriceId: v.string(),
    billingInterval: billingIntervalSchema,
    effectiveAt: v.string(),
})

const currentSubscriptionRawSchema = v.object({
    plan: v.nullable(planKeySchema),
    status: v.nullable(v.string()),
    pricePerSeat: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
    totalMonthlyPrice: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
    currentPriceId: v.optional(v.nullable(v.string()), null),
    nextBillingDate: v.optional(v.nullable(v.string()), null),
    cancelAtPeriodEnd: v.optional(v.boolean(), false),
    cancelsAt: v.optional(v.nullable(v.string()), null),
    pendingPlanChange: v.optional(v.nullable(pendingPlanChangeSchema), null),
    trialEnd: v.optional(v.nullable(v.string()), null),
    hasUsedTrial: v.boolean(),
    hasActiveSubscription: v.boolean(),
})

export const currentSubscriptionSchema = v.pipe(
    currentSubscriptionRawSchema,
    v.transform((value) => ({
        ...value,
        seats:
            value.pricePerSeat > 0 ? Math.round(value.totalMonthlyPrice / value.pricePerSeat) : 0,
    }))
)

export type CurrentSubscription = v.InferOutput<typeof currentSubscriptionSchema>
export type CurrentSubscriptionResponse = CurrentSubscription
export type PendingPlanChange = v.InferOutput<typeof pendingPlanChangeSchema>
export type BillingInterval = v.InferOutput<typeof billingIntervalSchema>
