import { afterEach, describe, expect, it } from "bun:test"
import type { Plan } from "@/entities/subscription"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type CheckoutData,
    checkoutSearchSchema,
    checkoutSuccessSearchSchema,
    completeCheckout,
    completeCheckoutById,
    resolveCheckoutSearchParams,
    resolveCheckoutSuccessRequest,
    startFreeTrial,
} from "../checkout"

function buildPlan(name: Plan["name"]): Plan {
    return {
        name,
        displayName: name,
        tagline: `${name} plan`,
        priceIds: {
            monthly: `${name}-monthly`,
            annual: `${name}-annual`,
        },
        prices: {
            monthly: {
                amount: 10,
                currency: "EUR",
            },
            annual: {
                amount: 8,
                currency: "EUR",
            },
        },
        features: [],
        freeTrial: {
            days: 14,
        },
    }
}

const plans: Plan[] = [buildPlan("starter"), buildPlan("professional")]

describe("resolveCheckoutSearchParams", () => {
    it("validates route search params without trusting malformed billing values", () => {
        expect(
            parseSchema(checkoutSearchSchema, {
                billing: "weekly",
                plan: "professional",
            })
        ).toEqual({})
    })

    it("resolves a valid plan and billing period", () => {
        const result = resolveCheckoutSearchParams(
            new URLSearchParams("plan=professional&billing=monthly"),
            plans
        )

        expect(result).toMatchObject({
            billing: "monthly",
            selectedPlanName: "professional",
            planIssue: null,
        })
        expect(result.selectedPlan?.name).toBe("professional")
    })

    it("does not fall back to the first plan when the plan is unavailable", () => {
        const result = resolveCheckoutSearchParams(new URLSearchParams("plan=proo"), plans)

        expect(result.billing).toBe("yearly")
        expect(result.selectedPlan).toBeNull()
        expect(result.selectedPlanName).toBe("proo")
        expect(result.planIssue).toBe("invalid")
    })

    it("requires an explicit plan param", () => {
        const result = resolveCheckoutSearchParams(new URLSearchParams("billing=monthly"), plans)

        expect(result.billing).toBe("monthly")
        expect(result.selectedPlan).toBeNull()
        expect(result.selectedPlanName).toBeNull()
        expect(result.planIssue).toBe("missing")
    })

    it("defaults invalid billing to yearly after validation", () => {
        const result = resolveCheckoutSearchParams(
            new URLSearchParams("plan=starter&billing=weekly"),
            plans
        )

        expect(result.billing).toBe("yearly")
        expect(result.selectedPlan?.name).toBe("starter")
        expect(result.planIssue).toBeNull()
    })
})

describe("resolveCheckoutSuccessRequest", () => {
    const storedCheckoutData: CheckoutData = {
        organizationName: "Stale Org",
        organizationSlug: "stale-org",
        plan: "starter",
        subscriptionId: "sub_stale",
        isTrial: true,
        trialRedirectUrl: "/org/stale/dashboard",
    }

    it("validates checkout success search params and drops unsafe redirects", () => {
        expect(
            parseSchema(checkoutSuccessSearchSchema, {
                checkout_id: "cs_123",
                redirect_url: "javascript:alert(1)",
            })
        ).toEqual({})
    })

    it("uses a checkout id from the URL as the authoritative completion input", () => {
        const result = resolveCheckoutSuccessRequest(
            new URLSearchParams("checkout_id=sub_url&redirect_status=succeeded"),
            storedCheckoutData
        )

        expect(result).toEqual({
            status: "ready",
            request: {
                kind: "server-intent",
                checkoutId: "sub_url",
            },
        })
    })

    it("uses the server redirect URL when no checkout id is available", () => {
        const result = resolveCheckoutSuccessRequest(
            new URLSearchParams("redirect_url=%2Forg%2Facme%2Fdashboard&redirect_status=succeeded"),
            null
        )

        expect(result).toEqual({
            status: "ready",
            request: {
                kind: "server-redirect",
                redirectUrl: "/org/acme/dashboard",
            },
        })
    })

    it("rejects unsafe redirect URL identifiers", () => {
        const result = resolveCheckoutSuccessRequest(
            new URLSearchParams("redirect_url=javascript%3Aalert%281%29"),
            null
        )

        expect(result).toEqual({ status: "invalid-identifier" })
    })

    it("supports subscription URL params without reading storage", () => {
        const result = resolveCheckoutSuccessRequest(
            new URLSearchParams("subscription_id=sub_123&organization_name=Acme"),
            null
        )

        expect(result).toEqual({
            status: "ready",
            request: {
                kind: "stripe-subscription",
                stripeSubscriptionId: "sub_123",
                organizationName: "Acme",
                organizationSlug: "acme",
            },
        })
    })

    it("falls back to stored subscription data only when the URL has no identifier", () => {
        const result = resolveCheckoutSuccessRequest(new URLSearchParams(""), storedCheckoutData)

        expect(result).toEqual({
            status: "ready",
            request: {
                kind: "stripe-subscription",
                stripeSubscriptionId: "sub_stale",
                organizationName: "Stale Org",
                organizationSlug: "stale-org",
            },
        })
    })

    it("falls back to stored trial redirect data when no completion id was stored", () => {
        const result = resolveCheckoutSuccessRequest(new URLSearchParams(""), {
            organizationName: "Trial Org",
            organizationSlug: "trial-org",
            plan: "starter",
            isTrial: true,
            trialRedirectUrl: "/org/trial/dashboard",
        })

        expect(result).toEqual({
            status: "ready",
            request: {
                kind: "server-redirect",
                redirectUrl: "/org/trial/dashboard",
            },
        })
    })

    it("reports payment failure before attempting completion", () => {
        const result = resolveCheckoutSuccessRequest(
            new URLSearchParams("checkout_id=sub_url&redirect_status=failed"),
            storedCheckoutData
        )

        expect(result).toEqual({ status: "payment-failed" })
    })

    it("requires a URL id, redirect, or stored completion input", () => {
        const result = resolveCheckoutSuccessRequest(new URLSearchParams(""), null)

        expect(result).toEqual({ status: "missing-identifier" })
    })
})

describe("completeCheckoutById", () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    it("posts the checkout id and parses the completion redirect", async () => {
        let requestBody: unknown = null
        let requestUrl = ""

        const fetchStub = Object.assign(
            async (...args: Parameters<typeof fetch>) => {
                const [input, init] = args
                requestUrl = String(input)
                requestBody = JSON.parse(String(init?.body))

                return new Response(JSON.stringify({ redirectUrl: "/org/acme/dashboard" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            },
            { preconnect: originalFetch.preconnect }
        )
        globalThis.fetch = fetchStub

        const result = await completeCheckoutById("sub_123")

        expect(requestUrl).toBe("/api/checkout/complete")
        expect(requestBody).toEqual({ checkoutId: "sub_123" })
        expect(result).toEqual({ redirectUrl: "/org/acme/dashboard" })
    })
})

describe("checkout organization slug payloads", () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    it("posts the explicit organization slug when starting a trial", async () => {
        let requestBody: unknown = null

        const fetchStub = Object.assign(
            async (...args: Parameters<typeof fetch>) => {
                const [, init] = args
                requestBody = JSON.parse(String(init?.body))

                return new Response(JSON.stringify({ redirectUrl: "/org/acme-inc/dashboard" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            },
            { preconnect: originalFetch.preconnect }
        )
        globalThis.fetch = fetchStub

        await startFreeTrial("Acme Inc", "acme-inc", "starter")

        expect(requestBody).toEqual({
            organizationName: "Acme Inc",
            organizationSlug: "acme-inc",
            plan: "starter",
        })
    })

    it("posts the explicit organization slug when completing a subscription", async () => {
        let requestBody: unknown = null

        const fetchStub = Object.assign(
            async (...args: Parameters<typeof fetch>) => {
                const [, init] = args
                requestBody = JSON.parse(String(init?.body))

                return new Response(JSON.stringify({ redirectUrl: "/org/acme-inc/dashboard" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            },
            { preconnect: originalFetch.preconnect }
        )
        globalThis.fetch = fetchStub

        await completeCheckout("sub_123", "Acme Inc", "acme-inc")

        expect(requestBody).toEqual({
            stripeSubscriptionId: "sub_123",
            organizationName: "Acme Inc",
            organizationSlug: "acme-inc",
        })
    })
})
