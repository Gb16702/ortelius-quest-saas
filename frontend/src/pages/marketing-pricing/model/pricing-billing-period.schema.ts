import * as v from "valibot"

export const pricingBillingPeriodSchema = v.picklist(["monthly", "yearly"])
export type PricingBillingPeriod = v.InferOutput<typeof pricingBillingPeriodSchema>
