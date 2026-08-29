import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    billingAddressApiSchema,
    billingAddressResponseSchema,
    cancelSubscriptionInputSchema,
    cancelSubscriptionResponseSchema,
    changePlanResponseSchema,
    confirmSubscribeResponseSchema,
    paymentMethodCardSchema,
    paymentMethodResponseSchema,
    paymentMethodSchema,
    paymentMethodSepaSchema,
    previewChangeResponseSchema,
    resumeSubscriptionResponseSchema,
    setupIntentResponseSchema,
    subscribeResponseSchema,
    updateBillingAddressResponseSchema,
    updatePaymentMethodResponseSchema,
} from "../subscription-api.schema"

// --- paymentMethodSchema (discriminated union) ---

describe("paymentMethodSchema — discriminated union: card variant valid inputs", () => {
    it("accepts a full card payment method", () => {
        const result = safeParseSchema(paymentMethodCardSchema, {
            type: "card",
            brand: "visa",
            last4: "4242",
            expMonth: 12,
            expYear: 2028,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.type).toBe("card")
        }
    })

    it("accepts card with nullish expMonth/expYear (transformed to undefined)", () => {
        const result = safeParseSchema(paymentMethodCardSchema, {
            type: "card",
            brand: "mastercard",
            last4: "1234",
            expMonth: null,
            expYear: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.expMonth).toBeUndefined()
            expect(result.data.expYear).toBeUndefined()
        }
    })

    it("accepts card with omitted expMonth/expYear", () => {
        const result = safeParseSchema(paymentMethodCardSchema, {
            type: "card",
            brand: "amex",
            last4: "5678",
        })
        expect(result.success).toBe(true)
    })
})

describe("paymentMethodSchema — discriminated union: sepa variant valid inputs", () => {
    it("accepts a full SEPA debit payment method", () => {
        const result = safeParseSchema(paymentMethodSepaSchema, {
            type: "sepa_debit",
            last4: "3000",
            bankCode: "DEUTDEDB",
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.type).toBe("sepa_debit")
        }
    })

    it("accepts SEPA with null bankCode", () => {
        const result = safeParseSchema(paymentMethodSepaSchema, {
            type: "sepa_debit",
            last4: "9000",
            bankCode: null,
        })
        expect(result.success).toBe(true)
    })
})

describe("paymentMethodSchema — discriminated union: malformed discriminator", () => {
    it("rejects an unknown payment method type", () => {
        const result = safeParseSchema(paymentMethodSchema, {
            type: "paypal",
            last4: "0001",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("type"))).toBe(true)
        }
    })

    it("rejects card missing brand field", () => {
        const result = safeParseSchema(paymentMethodSchema, {
            type: "card",
            last4: "1111",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("brand"))).toBe(true)
        }
    })

    it("rejects SEPA missing last4", () => {
        const result = safeParseSchema(paymentMethodSchema, {
            type: "sepa_debit",
            bankCode: "AAAA",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("last4"))).toBe(true)
        }
    })

    it("rejects object with no type discriminator", () => {
        const result = safeParseSchema(paymentMethodSchema, { last4: "0000", brand: "visa" })
        expect(result.success).toBe(false)
    })
})

// --- paymentMethodResponseSchema ---

describe("paymentMethodResponseSchema valid inputs", () => {
    it("accepts response with a card payment method", () => {
        const result = safeParseSchema(paymentMethodResponseSchema, {
            paymentMethod: {
                type: "card",
                brand: "visa",
                last4: "4242",
            },
        })
        expect(result.success).toBe(true)
    })

    it("accepts response with null paymentMethod", () => {
        const result = safeParseSchema(paymentMethodResponseSchema, { paymentMethod: null })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.paymentMethod).toBeNull()
        }
    })
})

describe("paymentMethodResponseSchema invalid inputs", () => {
    it("rejects missing paymentMethod key", () => {
        const result = safeParseSchema(paymentMethodResponseSchema, {})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("paymentMethod"))).toBe(true)
        }
    })
})

// --- setupIntentResponseSchema ---

describe("setupIntentResponseSchema valid inputs", () => {
    it("accepts a non-empty client secret", () => {
        const result = safeParseSchema(setupIntentResponseSchema, {
            clientSecret: "seti_abc_secret_xyz",
        })
        expect(result.success).toBe(true)
    })
})

describe("setupIntentResponseSchema invalid inputs", () => {
    it("rejects empty string client secret", () => {
        const result = safeParseSchema(setupIntentResponseSchema, { clientSecret: "" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("clientSecret"))).toBe(true)
        }
    })

    it("rejects missing clientSecret", () => {
        const result = safeParseSchema(setupIntentResponseSchema, {})
        expect(result.success).toBe(false)
    })
})

// --- updatePaymentMethodResponseSchema ---

describe("updatePaymentMethodResponseSchema valid inputs", () => {
    it("accepts success:true with a card payment method", () => {
        const result = safeParseSchema(updatePaymentMethodResponseSchema, {
            success: true,
            paymentMethod: {
                type: "card",
                brand: "amex",
                last4: "0005",
            },
        })
        expect(result.success).toBe(true)
    })

    it("accepts success:true with null paymentMethod", () => {
        const result = safeParseSchema(updatePaymentMethodResponseSchema, {
            success: true,
            paymentMethod: null,
        })
        expect(result.success).toBe(true)
    })
})

describe("updatePaymentMethodResponseSchema invalid inputs", () => {
    it("rejects success:false", () => {
        const result = safeParseSchema(updatePaymentMethodResponseSchema, {
            success: false,
            paymentMethod: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("success"))).toBe(true)
        }
    })

    it("rejects missing success field", () => {
        const result = safeParseSchema(updatePaymentMethodResponseSchema, { paymentMethod: null })
        expect(result.success).toBe(false)
    })
})

// --- billingAddressApiSchema ---

describe("billingAddressApiSchema valid inputs", () => {
    it("accepts a complete billing address", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "fr",
            line1: "10 Rue de la Paix",
            line2: null,
            city: "Paris",
            postalCode: "75001",
            state: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.country).toBe("FR")
        }
    })

    it("upcases the country code", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "de",
            line1: "Hauptstraße 1",
            line2: null,
            city: "Berlin",
            postalCode: "10115",
            state: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.country).toBe("DE")
        }
    })

    it("accepts address with line2 and state", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "US",
            line1: "1 Infinite Loop",
            line2: "Suite 200",
            city: "Cupertino",
            postalCode: "95014",
            state: "CA",
        })
        expect(result.success).toBe(true)
    })

    it("transforms nullish line2 to null", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "GB",
            line1: "221B Baker Street",
            line2: undefined,
            city: "London",
            postalCode: "NW1 6XE",
            state: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.line2).toBeNull()
        }
    })

    it("accepts address with null state", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "NL",
            line1: "Damrak 1",
            line2: null,
            city: "Amsterdam",
            postalCode: "1012 LG",
            state: null,
        })
        expect(result.success).toBe(true)
    })
})

describe("billingAddressApiSchema invalid inputs", () => {
    it("rejects country code that is not exactly 2 characters", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "FRA",
            line1: "1 rue",
            line2: null,
            city: "Paris",
            postalCode: "75001",
            state: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("country"))).toBe(true)
        }
    })

    it("rejects empty country string", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "",
            line1: "1 rue",
            line2: null,
            city: "Paris",
            postalCode: "75001",
            state: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("country"))).toBe(true)
        }
    })

    it("rejects missing line1", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "FR",
            line2: null,
            city: "Paris",
            postalCode: "75001",
            state: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("line1"))).toBe(true)
        }
    })

    it("rejects missing city", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "FR",
            line1: "1 rue",
            line2: null,
            postalCode: "75001",
            state: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("city"))).toBe(true)
        }
    })

    it("rejects missing postalCode", () => {
        const result = safeParseSchema(billingAddressApiSchema, {
            country: "FR",
            line1: "1 rue",
            line2: null,
            city: "Paris",
            state: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("postalCode"))).toBe(true)
        }
    })
})

// --- billingAddressResponseSchema ---

describe("billingAddressResponseSchema valid inputs", () => {
    it("accepts response with a billing address", () => {
        const result = safeParseSchema(billingAddressResponseSchema, {
            address: {
                country: "FR",
                line1: "1 rue",
                line2: null,
                city: "Paris",
                postalCode: "75001",
                state: null,
            },
        })
        expect(result.success).toBe(true)
    })

    it("accepts response with null address", () => {
        const result = safeParseSchema(billingAddressResponseSchema, { address: null })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.address).toBeNull()
        }
    })
})

describe("billingAddressResponseSchema invalid inputs", () => {
    it("rejects missing address key", () => {
        const result = safeParseSchema(billingAddressResponseSchema, {})
        expect(result.success).toBe(false)
    })
})

// --- updateBillingAddressResponseSchema ---

describe("updateBillingAddressResponseSchema valid inputs", () => {
    it("accepts a valid updated billing address response", () => {
        const result = safeParseSchema(updateBillingAddressResponseSchema, {
            address: {
                country: "DE",
                line1: "Musterstraße 1",
                line2: null,
                city: "Munich",
                postalCode: "80333",
                state: null,
            },
        })
        expect(result.success).toBe(true)
    })
})

describe("updateBillingAddressResponseSchema invalid inputs", () => {
    it("rejects missing address", () => {
        const result = safeParseSchema(updateBillingAddressResponseSchema, {})
        expect(result.success).toBe(false)
    })
})

// --- previewChangeResponseSchema (discriminated union) ---

describe("previewChangeResponseSchema — discriminated union: upgrade valid inputs", () => {
    const upgradeBase = {
        direction: "upgrade",
        newPlan: "Professional",
        newPlanKey: "professional",
        newPrice: 49,
        billingInterval: "monthly",
        currentPlan: "Starter",
        currentPlanKey: "starter",
        nextBillingDate: "2026-06-01",
        currency: "EUR",
        proratedNewCharge: 30,
        adjustment: -10,
        totalDueToday: 20,
        paymentMethod: null,
    }

    it("accepts a full upgrade preview with null paymentMethod", () => {
        const result = safeParseSchema(previewChangeResponseSchema, upgradeBase)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.direction).toBe("upgrade")
        }
    })

    it("accepts upgrade preview with a card payment method", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            ...upgradeBase,
            paymentMethod: {
                type: "card",
                brand: "visa",
                last4: "4242",
            },
        })
        expect(result.success).toBe(true)
    })
})

describe("previewChangeResponseSchema — discriminated union: downgrade valid inputs", () => {
    it("accepts a downgrade preview without upgrade-only fields", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            direction: "downgrade",
            newPlan: "Starter",
            newPlanKey: "starter",
            newPrice: 9,
            billingInterval: "monthly",
            currentPlan: "Professional",
            currentPlanKey: "professional",
            nextBillingDate: "2026-06-01",
            currency: "EUR",
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.direction).toBe("downgrade")
        }
    })
})

describe("previewChangeResponseSchema — discriminated union: malformed discriminator", () => {
    it("rejects an unknown direction value", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            direction: "lateral",
            newPlan: "Starter",
            newPlanKey: "starter",
            newPrice: 9,
            billingInterval: "monthly",
            currentPlan: "Pro",
            currentPlanKey: "professional",
            nextBillingDate: "2026-06-01",
            currency: "EUR",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("direction"))).toBe(true)
        }
    })

    it("rejects upgrade missing totalDueToday", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            direction: "upgrade",
            newPlan: "Professional",
            newPlanKey: "professional",
            newPrice: 49,
            billingInterval: "monthly",
            currentPlan: "Starter",
            currentPlanKey: "starter",
            nextBillingDate: "2026-06-01",
            currency: "EUR",
            proratedNewCharge: 30,
            adjustment: -10,
            paymentMethod: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("totalDueToday"))).toBe(true)
        }
    })

    it("rejects when nextBillingDate is absent from downgrade", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            direction: "downgrade",
            newPlan: "Starter",
            newPlanKey: "starter",
            newPrice: 9,
            billingInterval: "monthly",
            currentPlan: "Professional",
            currentPlanKey: "professional",
            currency: "EUR",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("nextBillingDate"))).toBe(true)
        }
    })

    it("rejects invalid planKey enum value", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            direction: "downgrade",
            newPlan: "Free",
            newPlanKey: "free",
            newPrice: 0,
            billingInterval: "monthly",
            currentPlan: "Professional",
            currentPlanKey: "professional",
            nextBillingDate: "2026-06-01",
            currency: "EUR",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("newPlanKey"))).toBe(true)
        }
    })

    it("rejects invalid billingInterval", () => {
        const result = safeParseSchema(previewChangeResponseSchema, {
            direction: "downgrade",
            newPlan: "Starter",
            newPlanKey: "starter",
            newPrice: 9,
            billingInterval: "weekly",
            currentPlan: "Professional",
            currentPlanKey: "professional",
            nextBillingDate: "2026-06-01",
            currency: "EUR",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("billingInterval"))).toBe(true)
        }
    })
})

// --- changePlanResponseSchema ---

describe("changePlanResponseSchema valid inputs", () => {
    it("accepts a valid upgrade response", () => {
        const result = safeParseSchema(changePlanResponseSchema, {
            success: true,
            subscriptionId: "sub_abc",
            direction: "upgrade",
            effectiveAt: "2026-05-16T00:00:00.000Z",
        })
        expect(result.success).toBe(true)
    })

    it("accepts a valid downgrade response", () => {
        const result = safeParseSchema(changePlanResponseSchema, {
            success: true,
            subscriptionId: "sub_xyz",
            direction: "downgrade",
            effectiveAt: "2026-06-01T00:00:00.000Z",
        })
        expect(result.success).toBe(true)
    })
})

describe("changePlanResponseSchema invalid inputs", () => {
    it("rejects success:false", () => {
        const result = safeParseSchema(changePlanResponseSchema, {
            success: false,
            subscriptionId: "sub_abc",
            direction: "upgrade",
            effectiveAt: "2026-05-16T00:00:00.000Z",
        })
        expect(result.success).toBe(false)
    })

    it("rejects invalid direction value", () => {
        const result = safeParseSchema(changePlanResponseSchema, {
            success: true,
            subscriptionId: "sub_abc",
            direction: "sideways",
            effectiveAt: "2026-05-16T00:00:00.000Z",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("direction"))).toBe(true)
        }
    })
})

// --- cancelSubscriptionInputSchema ---

describe("cancelSubscriptionInputSchema valid inputs", () => {
    it("accepts all cancel reason enum values", () => {
        for (const reason of [
            "too_expensive",
            "temporary_break",
            "missing_features",
            "switching_to_competitor",
            "low_usage",
            "bugs_or_errors",
            "other",
        ] as const) {
            const result = safeParseSchema(cancelSubscriptionInputSchema, {
                reason,
                feedback: null,
            })
            expect(result.success).toBe(true)
        }
    })

    it("accepts null reason and feedback", () => {
        const result = safeParseSchema(cancelSubscriptionInputSchema, {
            reason: null,
            feedback: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.reason).toBeNull()
            expect(result.data.feedback).toBeNull()
        }
    })

    it("accepts reason and string feedback", () => {
        const result = safeParseSchema(cancelSubscriptionInputSchema, {
            reason: "other",
            feedback: "Not the right product for us.",
        })
        expect(result.success).toBe(true)
    })

    it("transforms omitted reason to null", () => {
        const result = safeParseSchema(cancelSubscriptionInputSchema, {})
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.reason).toBeNull()
        }
    })
})

describe("cancelSubscriptionInputSchema invalid inputs", () => {
    it("rejects an unknown cancellation reason", () => {
        const result = safeParseSchema(cancelSubscriptionInputSchema, { reason: "not_a_reason" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("reason"))).toBe(true)
        }
    })

    it("rejects non-string feedback", () => {
        const result = safeParseSchema(cancelSubscriptionInputSchema, {
            reason: null,
            feedback: 42,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("feedback"))).toBe(true)
        }
    })
})

// --- cancelSubscriptionResponseSchema ---

describe("cancelSubscriptionResponseSchema valid inputs", () => {
    it("accepts success:true with a cancelsAt string", () => {
        const result = safeParseSchema(cancelSubscriptionResponseSchema, {
            success: true,
            cancelsAt: "2026-12-31T23:59:59.000Z",
        })
        expect(result.success).toBe(true)
    })

    it("accepts success:true with null cancelsAt (immediate cancel)", () => {
        const result = safeParseSchema(cancelSubscriptionResponseSchema, {
            success: true,
            cancelsAt: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.cancelsAt).toBeNull()
        }
    })
})

describe("cancelSubscriptionResponseSchema invalid inputs", () => {
    it("rejects success:false", () => {
        const result = safeParseSchema(cancelSubscriptionResponseSchema, {
            success: false,
            cancelsAt: null,
        })
        expect(result.success).toBe(false)
    })

    it("rejects missing cancelsAt field", () => {
        const result = safeParseSchema(cancelSubscriptionResponseSchema, { success: true })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("cancelsAt"))).toBe(true)
        }
    })
})

// --- resumeSubscriptionResponseSchema ---

describe("resumeSubscriptionResponseSchema valid inputs", () => {
    it("accepts a valid resume response", () => {
        const result = safeParseSchema(resumeSubscriptionResponseSchema, {
            success: true,
            plan: "professional",
        })
        expect(result.success).toBe(true)
    })
})

describe("resumeSubscriptionResponseSchema invalid inputs", () => {
    it("rejects an invalid plan key", () => {
        const result = safeParseSchema(resumeSubscriptionResponseSchema, {
            success: true,
            plan: "basic",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("plan"))).toBe(true)
        }
    })
})

// --- subscribeResponseSchema ---

describe("subscribeResponseSchema valid inputs", () => {
    it("accepts a valid subscribe response", () => {
        const result = safeParseSchema(subscribeResponseSchema, {
            clientSecret: "pi_abc_secret_xyz",
            subscriptionId: "sub_123",
            type: "payment",
        })
        expect(result.success).toBe(true)
    })
})

describe("subscribeResponseSchema invalid inputs", () => {
    it("rejects empty clientSecret", () => {
        const result = safeParseSchema(subscribeResponseSchema, {
            clientSecret: "",
            subscriptionId: "sub_123",
            type: "payment",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("clientSecret"))).toBe(true)
        }
    })

    it("rejects wrong type literal", () => {
        const result = safeParseSchema(subscribeResponseSchema, {
            clientSecret: "pi_abc_secret_xyz",
            subscriptionId: "sub_123",
            type: "setup",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("type"))).toBe(true)
        }
    })
})

// --- confirmSubscribeResponseSchema ---

describe("confirmSubscribeResponseSchema valid inputs", () => {
    it("accepts a valid confirm response", () => {
        const result = safeParseSchema(confirmSubscribeResponseSchema, {
            success: true,
            plan: "enterprise",
            subscriptionId: "sub_456",
        })
        expect(result.success).toBe(true)
    })
})

describe("confirmSubscribeResponseSchema invalid inputs", () => {
    it("rejects success:false", () => {
        const result = safeParseSchema(confirmSubscribeResponseSchema, {
            success: false,
            plan: "enterprise",
            subscriptionId: "sub_456",
        })
        expect(result.success).toBe(false)
    })

    it("rejects invalid plan key in confirm response", () => {
        const result = safeParseSchema(confirmSubscribeResponseSchema, {
            success: true,
            plan: "gold",
            subscriptionId: "sub_456",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("plan"))).toBe(true)
        }
    })
})
