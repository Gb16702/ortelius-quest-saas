import * as v from "valibot"
import { billingIntervalSchema, planKeySchema } from "@/entities/subscription"

const optionalNumberSchema = v.pipe(
    v.optional(v.nullable(v.number())),
    v.transform((value) => value ?? undefined)
)

const nullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

export const subscriptionErrorResponseSchema = v.looseObject({
    message: v.optional(v.string()),
})

export const paymentMethodCardSchema = v.object({
    type: v.literal("card"),
    brand: v.string(),
    last4: v.string(),
    expMonth: optionalNumberSchema,
    expYear: optionalNumberSchema,
})

export const paymentMethodSepaSchema = v.object({
    type: v.literal("sepa_debit"),
    last4: v.string(),
    bankCode: nullableStringSchema,
})

export const paymentMethodSchema = v.variant("type", [
    paymentMethodCardSchema,
    paymentMethodSepaSchema,
])

export const paymentMethodResponseSchema = v.object({
    paymentMethod: v.nullable(paymentMethodSchema),
})

export const setupIntentResponseSchema = v.object({
    clientSecret: v.pipe(v.string(), v.minLength(1)),
})

export const updatePaymentMethodResponseSchema = v.object({
    success: v.literal(true),
    paymentMethod: v.nullable(paymentMethodSchema),
})

export const billingAddressApiSchema = v.pipe(
    v.object({
        country: v.pipe(
            v.string(),
            v.length(2),
            v.transform((value) => value.toUpperCase())
        ),
        line1: v.string(),
        line2: nullableStringSchema,
        city: v.string(),
        postalCode: v.string(),
        state: nullableStringSchema,
    }),
    v.transform((address) => ({
        ...address,
        line2: address.line2 ?? null,
        state: address.state ?? null,
    }))
)

export const billingAddressResponseSchema = v.object({
    address: v.nullable(billingAddressApiSchema),
})

export const updateBillingAddressInputSchema = v.object({
    address: billingAddressApiSchema,
    name: v.optional(nullableStringSchema),
})

export const updateBillingAddressResponseSchema = v.object({
    address: billingAddressApiSchema,
})

const previewChangeBaseSchema = v.object({
    newPlan: v.string(),
    newPlanKey: planKeySchema,
    newPrice: v.number(),
    billingInterval: billingIntervalSchema,
    currentPlan: v.string(),
    currentPlanKey: planKeySchema,
    nextBillingDate: v.string(),
    currency: v.string(),
})

export const previewChangeUpgradeSchema = v.object({
    .../*@valibot-migrate we can't detect if previewChangeBaseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    previewChangeBaseSchema.entries,

    direction: v.literal("upgrade"),
    proratedNewCharge: v.number(),
    adjustment: v.number(),
    totalDueToday: v.number(),
    paymentMethod: v.nullable(paymentMethodSchema),
})

export const previewChangeDowngradeSchema = v.object({
    .../*@valibot-migrate we can't detect if previewChangeBaseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    previewChangeBaseSchema.entries,

    direction: v.literal("downgrade"),
})

export const previewChangeResponseSchema = v.variant("direction", [
    previewChangeUpgradeSchema,
    previewChangeDowngradeSchema,
])

export const changePlanResponseSchema = v.object({
    success: v.literal(true),
    subscriptionId: v.string(),
    direction: v.picklist(["upgrade", "downgrade"]),
    effectiveAt: v.string(),
})

export const cancelPendingChangeResponseSchema = v.object({
    success: v.literal(true),
})

export const cancelReasonsSchema = v.picklist([
    "too_expensive",
    "temporary_break",
    "missing_features",
    "switching_to_competitor",
    "low_usage",
    "bugs_or_errors",
    "other",
])

export const cancelSubscriptionInputSchema = v.pipe(
    v.object({
        reason: v.optional(v.nullable(cancelReasonsSchema)),
        feedback: v.optional(v.nullable(v.string())),
    }),
    v.transform((input) => ({
        ...input,
        reason: input.reason ?? null,
        feedback: input.feedback ?? null,
    }))
)

export const cancelSubscriptionResponseSchema = v.object({
    success: v.literal(true),
    cancelsAt: v.nullable(v.string()),
})

export const resumeSubscriptionResponseSchema = v.object({
    success: v.literal(true),
    plan: planKeySchema,
})

export const subscribeResponseSchema = v.object({
    clientSecret: v.pipe(v.string(), v.minLength(1)),
    subscriptionId: v.string(),
    type: v.literal("payment"),
})

export const confirmSubscribeResponseSchema = v.object({
    success: v.literal(true),
    plan: planKeySchema,
    subscriptionId: v.string(),
})

export type PaymentMethodCard = v.InferOutput<typeof paymentMethodCardSchema>
export type PaymentMethodSepa = v.InferOutput<typeof paymentMethodSepaSchema>
export type PaymentMethod = v.InferOutput<typeof paymentMethodSchema>
export type PaymentMethodResponse = v.InferOutput<typeof paymentMethodResponseSchema>
export type SetupIntentResponse = v.InferOutput<typeof setupIntentResponseSchema>
export type UpdatePaymentMethodResponse = v.InferOutput<typeof updatePaymentMethodResponseSchema>
export type BillingAddress = v.InferOutput<typeof billingAddressApiSchema>
export type BillingAddressResponse = v.InferOutput<typeof billingAddressResponseSchema>
export type UpdateBillingAddressInput = v.InferInput<typeof updateBillingAddressInputSchema>
export type UpdateBillingAddressResponse = v.InferOutput<typeof updateBillingAddressResponseSchema>
export type PreviewChangeUpgrade = v.InferOutput<typeof previewChangeUpgradeSchema>
export type PreviewChangeDowngrade = v.InferOutput<typeof previewChangeDowngradeSchema>
export type PreviewChangeResponse = v.InferOutput<typeof previewChangeResponseSchema>
export type ChangePlanResponse = v.InferOutput<typeof changePlanResponseSchema>
export type CancelPendingChangeResponse = v.InferOutput<typeof cancelPendingChangeResponseSchema>
export type CancelReason = v.InferOutput<typeof cancelReasonsSchema>
export type CancelSubscriptionInput = v.InferInput<typeof cancelSubscriptionInputSchema>
export type CancelSubscriptionResponse = v.InferOutput<typeof cancelSubscriptionResponseSchema>
export type ResumeSubscriptionResponse = v.InferOutput<typeof resumeSubscriptionResponseSchema>
export type SubscribeResponse = v.InferOutput<typeof subscribeResponseSchema>
export type ConfirmSubscribeResponse = v.InferOutput<typeof confirmSubscribeResponseSchema>
