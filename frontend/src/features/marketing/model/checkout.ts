import * as v from "valibot"
import {
    checkOrganizationSlug,
    organizationSlugSchema,
    slugifyOrganizationName,
} from "@/entities/organization"
import type { Plan } from "@/entities/subscription"
import { parseJsonResponse, readJsonResponse } from "@/shared/api/http.response"
import { appPathRedirectSchema, httpUrlSchema } from "@/shared/lib/validation/url.schema"

export const CHECKOUT_STORAGE_KEY = "ortelius_checkout"
const CHECKOUT_BILLING_PERIOD_STORAGE_KEY = "ortelius_billing_period"
export const TOTAL_STEPS = 1
export const ORG_NAME_MIN_LENGTH = 2
export const ORG_NAME_MAX_LENGTH = 32

const checkoutRedirectSchema = v.union([appPathRedirectSchema, httpUrlSchema])

const checkoutDataSchema = v.object({
    organizationName: v.string(),
    organizationSlug: v.optional(organizationSlugSchema),
    plan: v.string(),
    checkoutId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    isTrial: v.optional(v.boolean()),
    trialRedirectUrl: v.optional(checkoutRedirectSchema),
})
export type CheckoutData = v.InferOutput<typeof checkoutDataSchema>

export const checkoutBillingPeriodSchema = v.picklist(["monthly", "yearly"])
export type CheckoutBillingPeriod = v.InferOutput<typeof checkoutBillingPeriodSchema>

export const checkoutPlanSearchSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
export type CheckoutPlanSearch = v.InferOutput<typeof checkoutPlanSearchSchema>

export const checkoutSearchSchema = v.fallback(
    v.object({
        billing: v.optional(checkoutBillingPeriodSchema),
        plan: v.optional(checkoutPlanSearchSchema),
    }),
    {}
)
export type CheckoutSearch = v.InferOutput<typeof checkoutSearchSchema>

const checkoutSuccessIdentifierSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
export const checkoutSuccessSearchSchema = v.fallback(
    v.object({
        checkout_id: v.optional(checkoutSuccessIdentifierSchema),
        checkoutId: v.optional(checkoutSuccessIdentifierSchema),
        intent_id: v.optional(checkoutSuccessIdentifierSchema),
        intentId: v.optional(checkoutSuccessIdentifierSchema),
        organization_name: v.optional(checkoutSuccessIdentifierSchema),
        organizationName: v.optional(checkoutSuccessIdentifierSchema),
        organization_slug: v.optional(organizationSlugSchema),
        organizationSlug: v.optional(organizationSlugSchema),
        redirect: v.optional(checkoutRedirectSchema),
        redirect_status: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
        redirect_url: v.optional(checkoutRedirectSchema),
        redirectUrl: v.optional(checkoutRedirectSchema),
        session_id: v.optional(checkoutSuccessIdentifierSchema),
        sessionId: v.optional(checkoutSuccessIdentifierSchema),
        stripe_subscription_id: v.optional(checkoutSuccessIdentifierSchema),
        stripeSubscriptionId: v.optional(checkoutSuccessIdentifierSchema),
        subscription_id: v.optional(checkoutSuccessIdentifierSchema),
        subscriptionId: v.optional(checkoutSuccessIdentifierSchema),
    }),
    {}
)
export type CheckoutSuccessSearch = v.InferOutput<typeof checkoutSuccessSearchSchema>

export type CheckoutPlanSearchIssue = "missing" | "invalid"

interface ResolvedCheckoutSearchParams {
    billing: CheckoutBillingPeriod
    selectedPlan: Plan | null
    selectedPlanName: CheckoutPlanSearch | null
    planIssue: CheckoutPlanSearchIssue | null
}

export function resolveCheckoutSearchParams(
    searchParams: URLSearchParams,
    plans: readonly Plan[]
): ResolvedCheckoutSearchParams {
    const billingResult = v.safeParse(checkoutBillingPeriodSchema, searchParams.get("billing"))
    const billing = billingResult.success ? billingResult.output : "yearly"
    const rawPlan = searchParams.get("plan")
    const planResult = v.safeParse(checkoutPlanSearchSchema, rawPlan)

    if (!planResult.success) {
        const planIssue = rawPlan === null || rawPlan.trim() === "" ? "missing" : "invalid"

        return {
            billing,
            selectedPlan: null,
            selectedPlanName: null,
            planIssue,
        }
    }

    const selectedPlan =
        plans.find((plan) => plan.name.toLowerCase() === planResult.output.toLowerCase()) ?? null

    return {
        billing,
        selectedPlan,
        selectedPlanName: planResult.output,
        planIssue: selectedPlan ? null : "invalid",
    }
}

export function createCheckoutSearchParams(search: CheckoutSearch): URLSearchParams {
    const searchParams = new URLSearchParams()
    if (search.billing) searchParams.set("billing", search.billing)
    if (search.plan) searchParams.set("plan", search.plan)

    return searchParams
}

export function createCheckoutSuccessSearchParams(search: CheckoutSuccessSearch): URLSearchParams {
    const searchParams = new URLSearchParams()

    for (const [name, value] of Object.entries(search)) {
        if (typeof value === "string" && value.trim()) {
            searchParams.set(name, value)
        }
    }

    return searchParams
}

const checkOrganizationNameResponseSchema = v.object({
    available: v.boolean(),
    errorCode: v.optional(v.string()),
    suggestedSlug: v.optional(v.string()),
})

const startFreeTrialResponseSchema = v.object({
    checkoutId: v.optional(v.pipe(v.string(), v.minLength(1))),
    redirectUrl: checkoutRedirectSchema,
})

const completeCheckoutResponseSchema = v.object({
    redirectUrl: checkoutRedirectSchema,
})

export type CheckoutSuccessRequest =
    | {
          kind: "server-intent"
          checkoutId: string
      }
    | {
          kind: "server-redirect"
          redirectUrl: string
      }
    | {
          kind: "stripe-subscription"
          stripeSubscriptionId: string
          organizationName: string
          organizationSlug: string
      }

export type CheckoutSuccessResolution =
    | {
          status: "ready"
          request: CheckoutSuccessRequest
      }
    | {
          status: "missing-identifier"
      }
    | {
          status: "invalid-identifier"
      }
    | {
          status: "payment-failed"
      }

function getFirstNonEmptySearchParam(
    searchParams: URLSearchParams,
    names: readonly string[]
): string | null {
    for (const name of names) {
        const value = searchParams.get(name)
        if (value?.trim()) return value.trim()
    }

    return null
}

function getFirstRedirectSearchParam(searchParams: URLSearchParams): {
    redirectUrl: string | null
    isInvalid: boolean
} {
    for (const name of ["redirect_url", "redirectUrl", "redirect"]) {
        const value = searchParams.get(name)
        if (value === null) continue

        const redirectResult = v.safeParse(checkoutRedirectSchema, value)
        if (redirectResult.success) {
            return { redirectUrl: redirectResult.output, isInvalid: false }
        }

        return { redirectUrl: null, isInvalid: true }
    }

    return { redirectUrl: null, isInvalid: false }
}

export function resolveCheckoutSuccessRequest(
    searchParams: URLSearchParams,
    storedCheckoutData: CheckoutData | null
): CheckoutSuccessResolution {
    const redirectStatus = searchParams.get("redirect_status")
    if (redirectStatus && redirectStatus !== "succeeded") {
        return { status: "payment-failed" }
    }

    const checkoutId =
        getFirstNonEmptySearchParam(searchParams, [
            "checkout_id",
            "checkoutId",
            "session_id",
            "sessionId",
            "intent_id",
            "intentId",
        ]) ?? storedCheckoutData?.checkoutId

    if (checkoutId) {
        return {
            status: "ready",
            request: {
                kind: "server-intent",
                checkoutId,
            },
        }
    }

    const redirectParam = getFirstRedirectSearchParam(searchParams)
    if (redirectParam.isInvalid) {
        return { status: "invalid-identifier" }
    }

    if (redirectParam.redirectUrl) {
        return {
            status: "ready",
            request: {
                kind: "server-redirect",
                redirectUrl: redirectParam.redirectUrl,
            },
        }
    }

    const stripeSubscriptionId =
        getFirstNonEmptySearchParam(searchParams, [
            "stripe_subscription_id",
            "stripeSubscriptionId",
            "subscription_id",
            "subscriptionId",
        ]) ?? storedCheckoutData?.subscriptionId
    const organizationName =
        getFirstNonEmptySearchParam(searchParams, ["organization_name", "organizationName"]) ??
        storedCheckoutData?.organizationName
    const organizationSlug =
        getFirstNonEmptySearchParam(searchParams, ["organization_slug", "organizationSlug"]) ??
        storedCheckoutData?.organizationSlug ??
        (organizationName ? slugifyOrganizationName(organizationName) : null)

    if (stripeSubscriptionId && organizationName && organizationSlug) {
        return {
            status: "ready",
            request: {
                kind: "stripe-subscription",
                stripeSubscriptionId,
                organizationName,
                organizationSlug,
            },
        }
    }

    if (storedCheckoutData?.isTrial && storedCheckoutData.trialRedirectUrl) {
        return {
            status: "ready",
            request: {
                kind: "server-redirect",
                redirectUrl: storedCheckoutData.trialRedirectUrl,
            },
        }
    }

    return { status: "missing-identifier" }
}

export function getStoredCheckoutData(): CheckoutData | null {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem(CHECKOUT_STORAGE_KEY)
    if (!stored) return null
    try {
        const parsedJson: unknown = JSON.parse(stored)
        const parsedCheckoutData = v.safeParse(checkoutDataSchema, parsedJson)
        return parsedCheckoutData.success ? parsedCheckoutData.output : null
    } catch {
        return null
    }
}

export function saveCheckoutData(data: CheckoutData): void {
    if (typeof window === "undefined") return
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(data))
}

export function clearCheckoutData(storage?: Pick<Storage, "removeItem">): void {
    const targetStorage =
        storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)

    if (!targetStorage) return

    targetStorage.removeItem(CHECKOUT_STORAGE_KEY)
}

export function clearCheckoutState(storage?: Pick<Storage, "removeItem">): void {
    clearCheckoutData(storage)

    const targetStorage =
        storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)

    if (!targetStorage) return

    targetStorage.removeItem(CHECKOUT_BILLING_PERIOD_STORAGE_KEY)
}

export type CheckOrganizationNameResponse = v.InferOutput<
    typeof checkOrganizationNameResponseSchema
>

export async function checkOrganizationName(name: string): Promise<CheckOrganizationNameResponse> {
    const response = await fetch(
        `/api/onboarding/check-organization-name?name=${encodeURIComponent(name)}`
    )

    if (!response.ok) {
        throw new Error(`Failed to check organization name: ${response.statusText}`)
    }

    return v.parse(checkOrganizationNameResponseSchema, await readJsonResponse(response))
}

export { checkOrganizationSlug }

export type StartFreeTrialResponse = v.InferOutput<typeof startFreeTrialResponseSchema>

export async function startFreeTrial(
    organizationName: string,
    organizationSlug: string,
    plan: string
): Promise<StartFreeTrialResponse> {
    const parsedSlug = v.parse(organizationSlugSchema, organizationSlug)
    const response = await fetch(`/api/checkout/start-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName, organizationSlug: parsedSlug, plan }),
    })

    return parseJsonResponse(response, startFreeTrialResponseSchema, "Failed to start trial")
}

export type CompleteCheckoutResponse = v.InferOutput<typeof completeCheckoutResponseSchema>

export async function completeCheckoutById(checkoutId: string): Promise<CompleteCheckoutResponse> {
    const response = await fetch(`/api/checkout/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
    })

    return parseJsonResponse(
        response,
        completeCheckoutResponseSchema,
        "Failed to complete checkout"
    )
}

export async function completeCheckout(
    stripeSubscriptionId: string,
    organizationName: string,
    organizationSlug: string
): Promise<CompleteCheckoutResponse> {
    const parsedSlug = v.parse(organizationSlugSchema, organizationSlug)
    const response = await fetch(`/api/checkout/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            stripeSubscriptionId,
            organizationName,
            organizationSlug: parsedSlug,
        }),
    })

    return parseJsonResponse(
        response,
        completeCheckoutResponseSchema,
        "Failed to complete checkout"
    )
}
