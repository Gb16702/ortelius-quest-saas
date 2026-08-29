import * as v from "valibot"

export const billingAddressSchema = v.object({
    country: v.pipe(
        v.string(),
        v.length(2, "Country is required"),
        v.transform((v) => v.toUpperCase())
    ),
    line1: v.pipe(v.string(), v.minLength(1, "Address line 1 is required"), v.maxLength(200)),
    line2: v.optional(v.pipe(v.string(), v.maxLength(200))),
    postalCode: v.pipe(v.string(), v.minLength(1, "Postal code is required"), v.maxLength(20)),
    city: v.pipe(v.string(), v.minLength(1, "City is required"), v.maxLength(100)),
    state: v.optional(v.pipe(v.string(), v.maxLength(100))),
})

export type BillingAddressFormData = v.InferOutput<typeof billingAddressSchema>
