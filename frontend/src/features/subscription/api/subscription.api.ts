import { useQuery } from "@tanstack/react-query"
import {
    currentSubscriptionSchema,
    type PlansResponse,
    plansResponseSchema,
} from "@/entities/subscription"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type InvoiceEmailState,
    invoiceEmailStateSchema,
} from "../model/schemas/invoice-email.schema"
import {
    type InvoiceLanguageState,
    invoiceLanguageStateSchema,
} from "../model/schemas/invoice-language.schema"
import {
    type BillingAddressResponse,
    billingAddressResponseSchema,
    type PaymentMethodResponse,
    paymentMethodResponseSchema,
    subscriptionErrorResponseSchema,
} from "../model/schemas/subscription-api.schema"
import type { CurrentSubscription } from "../model/subscription"
import { plansKeys, subscriptionKeys } from "./subscription.query-keys"

function getSubscriptionErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(subscriptionErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

async function fetchPlans(): Promise<PlansResponse> {
    const res = await fetch(`/api/onboarding/plans`)
    if (!res.ok) throw new Error("Failed to fetch plans")
    return parseSchema(plansResponseSchema, await readJsonResponse(res))
}

async function fetchCurrentSubscription(): Promise<CurrentSubscription> {
    const res = await fetch(`/api/subscription/current`, {
        credentials: "include",
    })
    if (!res.ok) throw new Error("Failed to fetch subscription")
    return parseSchema(currentSubscriptionSchema, await readJsonResponse(res))
}

async function fetchPaymentMethod(): Promise<PaymentMethodResponse> {
    const res = await fetch(`/api/subscription/payment-method`, {
        credentials: "include",
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
        throw new Error(getSubscriptionErrorMessage(json, "Failed to load payment method"))
    }
    return parseSchema(paymentMethodResponseSchema, json)
}

async function fetchBillingAddress(): Promise<BillingAddressResponse> {
    const res = await fetch(`/api/subscription/billing-address`, {
        credentials: "include",
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
        throw new Error(getSubscriptionErrorMessage(json, "Failed to load billing address"))
    }
    return parseSchema(billingAddressResponseSchema, json)
}

async function fetchInvoiceEmail(): Promise<InvoiceEmailState> {
    const res = await fetch(`/api/subscription/invoice-email`, {
        credentials: "include",
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
        throw new Error(getSubscriptionErrorMessage(json, "Failed to load invoice email"))
    }
    return parseSchema(invoiceEmailStateSchema, json)
}

async function fetchInvoiceLanguage(): Promise<InvoiceLanguageState> {
    const res = await fetch(`/api/subscription/invoice-language`, {
        credentials: "include",
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
        throw new Error(getSubscriptionErrorMessage(json, "Failed to load invoice language"))
    }
    return parseSchema(invoiceLanguageStateSchema, json)
}

export function usePlans() {
    return useQuery({
        queryKey: plansKeys.all,
        queryFn: fetchPlans,
        staleTime: 5 * 60_000,
    })
}

export function useCurrentSubscription(organizationId: string | null | undefined) {
    return useQuery({
        queryKey: subscriptionKeys.current(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchCurrentSubscription()
        },
        enabled: !!organizationId,
        staleTime: 30_000,
    })
}

export function usePaymentMethod(
    organizationId: string | null | undefined,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: subscriptionKeys.paymentMethod(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchPaymentMethod()
        },
        enabled: !!organizationId && enabled,
        staleTime: 30_000,
    })
}

export function useBillingAddress(
    organizationId: string | null | undefined,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: subscriptionKeys.billingAddress(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchBillingAddress()
        },
        enabled: !!organizationId && enabled,
        staleTime: 30_000,
    })
}

export function useInvoiceEmail(
    organizationId: string | null | undefined,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: subscriptionKeys.invoiceEmail(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchInvoiceEmail()
        },
        enabled: !!organizationId && enabled,
        staleTime: 30_000,
    })
}

export function useInvoiceLanguage(
    organizationId: string | null | undefined,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: subscriptionKeys.invoiceLanguage(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchInvoiceLanguage()
        },
        enabled: !!organizationId && enabled,
        staleTime: 30_000,
    })
}
