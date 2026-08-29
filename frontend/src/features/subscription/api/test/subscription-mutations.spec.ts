import { describe, expect, it } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { createElement } from "react"
import {
    type OrganizationSetupStatus,
    organizationSettingsKeys,
    organizationSetupKeys,
} from "@/entities/organization"
import { TEST_ORG_ID } from "@/shared/test/fixtures/identity"
import { server } from "@/shared/test/msw/msw-server"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import type { UpdateBillingAddressInput } from "../../model/subscription"
import {
    useChangePlan,
    useUpdateBillingAddress,
    useUpdatePaymentMethod,
    useUpdateTaxId,
} from "../subscription.mutations"
import { plansKeys, subscriptionKeys } from "../subscription.query-keys"

const CHANGE_PLAN_URL = "/api/subscription/change-plan"
const BILLING_ADDRESS_URL = "/api/subscription/billing-address"
const UPDATE_PAYMENT_METHOD_URL = "/api/subscription/update-payment-method"
const TAX_ID_URL = `/api/organizations/${TEST_ORG_ID}/tax-id`

const setupStatus: OrganizationSetupStatus = {
    hasLogo: true,
    hasTagline: true,
    hasOverview: true,
    hasServices: true,
    hasCargoTypes: true,
    hasVatConfig: false,
    hasLegalDocuments: false,
    memberCount: 2,
    isComplete: false,
}

type ErrorBody = {
    message: string
    details?: { field?: string }
}

interface CapturedRequest {
    url: string
    method: string
    body: unknown
}

function createMutationQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
            mutations: { retry: false },
        },
    })
}

function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return createElement(QueryClientProvider, { client: queryClient }, children)
    }
}

async function readJsonBody(request: Request): Promise<unknown> {
    const text = await request.text()
    if (text === "") return null
    try {
        return JSON.parse(text) as unknown
    } catch {
        return null
    }
}

function captureNextRequest(method: "POST" | "PUT", url: string): Promise<CapturedRequest> {
    return new Promise((resolve) => {
        const handler =
            method === "POST"
                ? http.post(url, async ({ request }) => {
                      resolve({
                          url: new URL(request.url).pathname,
                          method: request.method,
                          body: await readJsonBody(request.clone()),
                      })
                      return HttpResponse.json({ success: true })
                  })
                : http.put(url, async ({ request }) => {
                      resolve({
                          url: new URL(request.url).pathname,
                          method: request.method,
                          body: await readJsonBody(request.clone()),
                      })
                      return HttpResponse.json({ success: true })
                  })
        server.use(handler)
    })
}

function captureNextPatchRequest(url: string): Promise<CapturedRequest> {
    return new Promise((resolve) => {
        server.use(
            http.patch(url, async ({ request }) => {
                resolve({
                    url: new URL(request.url).pathname,
                    method: request.method,
                    body: await readJsonBody(request.clone()),
                })
                return HttpResponse.json({ success: true })
            })
        )
    })
}

function changePlanSuccess(direction: "upgrade" | "downgrade") {
    return http.post(CHANGE_PLAN_URL, () =>
        HttpResponse.json({
            success: true,
            subscriptionId: "sub_test_123",
            direction,
            effectiveAt: "2026-06-15T00:00:00.000Z",
        })
    )
}

function changePlanWithStatus(status: number, body: ErrorBody) {
    return http.post(CHANGE_PLAN_URL, () => HttpResponse.json(body, { status }))
}

function billingAddressSuccess() {
    return http.put(BILLING_ADDRESS_URL, () =>
        HttpResponse.json({
            address: {
                country: "FR",
                line1: "1 rue de Rivoli",
                line2: null,
                city: "Paris",
                postalCode: "75001",
                state: null,
            },
        })
    )
}

function billingAddressWithStatus(status: number, body: ErrorBody) {
    return http.put(BILLING_ADDRESS_URL, () => HttpResponse.json(body, { status }))
}

function updatePaymentMethodSuccess() {
    return http.post(UPDATE_PAYMENT_METHOD_URL, () =>
        HttpResponse.json({
            success: true,
            paymentMethod: {
                type: "card",
                brand: "visa",
                last4: "4242",
                expMonth: 12,
                expYear: 2030,
            },
        })
    )
}

function updatePaymentMethodWithStatus(status: number, body: ErrorBody) {
    return http.post(UPDATE_PAYMENT_METHOD_URL, () => HttpResponse.json(body, { status }))
}

function taxIdSuccess() {
    return http.patch(TAX_ID_URL, () => HttpResponse.json({ success: true }))
}

function buildValidBillingAddressInput(): UpdateBillingAddressInput {
    return {
        address: {
            country: "fr",
            line1: "1 rue de Rivoli",
            line2: null,
            city: "Paris",
            postalCode: "75001",
            state: null,
        },
        name: "Acme Logistics",
    }
}

describe("subscription billing mutations", () => {
    setupMswServer()

    describe("useChangePlan", () => {
        it("posts to /api/subscription/change-plan with the priceId body (upgrade)", async () => {
            const captured = captureNextRequest("POST", CHANGE_PLAN_URL)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            result.current.mutate("price_upgrade_professional")

            const request = await captured
            expect(request.method).toBe("POST")
            expect(request.url).toBe(CHANGE_PLAN_URL)
            expect(request.body).toEqual({ priceId: "price_upgrade_professional" })
        })

        it("resolves with the upgrade response payload and invalidates subscription.current + plans.all", async () => {
            server.use(changePlanSuccess("upgrade"))
            const queryClient = createMutationQueryClient()
            const currentKey = subscriptionKeys.current(TEST_ORG_ID)
            const plansKey = plansKeys.all
            queryClient.setQueryData(currentKey, { plan: "starter" })
            queryClient.setQueryData(plansKey, { plans: [] })

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync("price_professional_monthly")
            expect(response.success).toBe(true)
            expect(response.direction).toBe("upgrade")
            expect(response.subscriptionId).toBe("sub_test_123")

            await waitFor(() => {
                expect(queryClient.getQueryState(currentKey)?.isInvalidated).toBe(true)
                expect(queryClient.getQueryState(plansKey)?.isInvalidated).toBe(true)
            })
        })

        it("resolves with the downgrade response payload and invalidates subscription.current + plans.all", async () => {
            server.use(changePlanSuccess("downgrade"))
            const queryClient = createMutationQueryClient()
            const currentKey = subscriptionKeys.current(TEST_ORG_ID)
            const plansKey = plansKeys.all
            queryClient.setQueryData(currentKey, { plan: "professional" })
            queryClient.setQueryData(plansKey, { plans: [] })

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync("price_starter_monthly")
            expect(response.direction).toBe("downgrade")

            await waitFor(() => {
                expect(queryClient.getQueryState(currentKey)?.isInvalidated).toBe(true)
                expect(queryClient.getQueryState(plansKey)?.isInvalidated).toBe(true)
            })
        })

        it("surfaces a 400 server validation message and leaves cached state untouched (no optimistic commit)", async () => {
            server.use(
                changePlanWithStatus(400, {
                    message: "Invalid priceId",
                    details: { field: "priceId" },
                })
            )
            const queryClient = createMutationQueryClient()
            const currentKey = subscriptionKeys.current(TEST_ORG_ID)
            const cached: { plan: string } = { plan: "starter" }
            queryClient.setQueryData(currentKey, cached)

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("price_bad")).rejects.toThrow("Invalid priceId")

            expect(queryClient.getQueryData<{ plan: string }>(currentKey)).toEqual(cached)
            expect(queryClient.getQueryState(currentKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 402 payment required without committing optimistic UI changes", async () => {
            server.use(
                changePlanWithStatus(402, {
                    message: "Payment required to upgrade",
                })
            )
            const queryClient = createMutationQueryClient()
            const currentKey = subscriptionKeys.current(TEST_ORG_ID)
            const cached: { plan: string } = { plan: "starter" }
            queryClient.setQueryData(currentKey, cached)

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("price_upgrade")).rejects.toThrow(
                "Payment required to upgrade"
            )

            expect(queryClient.getQueryData<{ plan: string }>(currentKey)).toEqual(cached)
            expect(queryClient.getQueryState(currentKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 403 forbidden and does not invalidate subscription.current", async () => {
            server.use(
                changePlanWithStatus(403, {
                    message: "Insufficient permissions to change plan",
                })
            )
            const queryClient = createMutationQueryClient()
            const currentKey = subscriptionKeys.current(TEST_ORG_ID)
            queryClient.setQueryData(currentKey, { plan: "starter" })

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("price_upgrade")).rejects.toThrow(
                "Insufficient permissions to change plan"
            )

            expect(queryClient.getQueryState(currentKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 409 conflict when already subscribed to the requested plan", async () => {
            server.use(
                changePlanWithStatus(409, {
                    message: "Already subscribed to this plan",
                })
            )
            const queryClient = createMutationQueryClient()

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("price_professional_monthly")).rejects.toThrow(
                "Already subscribed to this plan"
            )
        })

        it("rejects gracefully when Stripe upstream is unavailable (503)", async () => {
            server.use(
                changePlanWithStatus(503, {
                    message: "Stripe is temporarily unavailable",
                })
            )
            const queryClient = createMutationQueryClient()
            const currentKey = subscriptionKeys.current(TEST_ORG_ID)
            queryClient.setQueryData(currentKey, { plan: "starter" })

            const { result } = renderHook(() => useChangePlan(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("price_professional_monthly")).rejects.toThrow(
                "Stripe is temporarily unavailable"
            )

            expect(queryClient.getQueryState(currentKey)?.isInvalidated ?? false).toBe(false)
        })
    })

    describe("useUpdateBillingAddress", () => {
        it("puts to /api/subscription/billing-address with the parsed address body", async () => {
            const captured = captureNextRequest("PUT", BILLING_ADDRESS_URL)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            result.current.mutate(buildValidBillingAddressInput())

            const request = await captured
            expect(request.method).toBe("PUT")
            expect(request.url).toBe(BILLING_ADDRESS_URL)
            expect(request.body).toEqual({
                address: {
                    country: "FR",
                    line1: "1 rue de Rivoli",
                    line2: null,
                    city: "Paris",
                    postalCode: "75001",
                    state: null,
                },
                name: "Acme Logistics",
            })
        })

        it("resolves with the saved address and invalidates the billing address query key", async () => {
            server.use(billingAddressSuccess())
            const queryClient = createMutationQueryClient()
            const billingKey = subscriptionKeys.billingAddress(TEST_ORG_ID)
            queryClient.setQueryData(billingKey, { address: null })

            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync(buildValidBillingAddressInput())
            expect(response.address.country).toBe("FR")
            expect(response.address.city).toBe("Paris")

            await waitFor(() => {
                expect(queryClient.getQueryState(billingKey)?.isInvalidated).toBe(true)
            })
        })

        it("surfaces a 400 server validation error with the field detail and leaves cache unchanged", async () => {
            server.use(
                billingAddressWithStatus(400, {
                    message: "Invalid billing address",
                    details: { field: "postalCode" },
                })
            )
            const queryClient = createMutationQueryClient()
            const billingKey = subscriptionKeys.billingAddress(TEST_ORG_ID)
            const cached: { address: { country: string; city: string } } = {
                address: { country: "FR", city: "Lyon" },
            }
            queryClient.setQueryData(billingKey, cached)

            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync(buildValidBillingAddressInput())
            ).rejects.toThrow("Invalid billing address")

            expect(
                queryClient.getQueryData<{ address: { country: string; city: string } }>(billingKey)
            ).toEqual(cached)
            expect(queryClient.getQueryState(billingKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 402 payment required without committing optimistic UI changes", async () => {
            server.use(
                billingAddressWithStatus(402, {
                    message: "Payment required before address update",
                })
            )
            const queryClient = createMutationQueryClient()
            const billingKey = subscriptionKeys.billingAddress(TEST_ORG_ID)
            const cached: { address: null } = { address: null }
            queryClient.setQueryData(billingKey, cached)

            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync(buildValidBillingAddressInput())
            ).rejects.toThrow("Payment required before address update")

            expect(queryClient.getQueryData<{ address: null }>(billingKey)).toEqual(cached)
            expect(queryClient.getQueryState(billingKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 403 forbidden and does not invalidate the billing address key", async () => {
            server.use(
                billingAddressWithStatus(403, {
                    message: "Insufficient permissions to update billing address",
                })
            )
            const queryClient = createMutationQueryClient()
            const billingKey = subscriptionKeys.billingAddress(TEST_ORG_ID)
            queryClient.setQueryData(billingKey, { address: null })

            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync(buildValidBillingAddressInput())
            ).rejects.toThrow("Insufficient permissions to update billing address")

            expect(queryClient.getQueryState(billingKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 409 conflict (duplicate or stale tax/address state)", async () => {
            server.use(
                billingAddressWithStatus(409, {
                    message: "Conflict updating billing address",
                })
            )
            const queryClient = createMutationQueryClient()

            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync(buildValidBillingAddressInput())
            ).rejects.toThrow("Conflict updating billing address")
        })

        it("rejects gracefully when Stripe upstream is unavailable (503)", async () => {
            server.use(
                billingAddressWithStatus(503, {
                    message: "Stripe is temporarily unavailable",
                })
            )
            const queryClient = createMutationQueryClient()
            const billingKey = subscriptionKeys.billingAddress(TEST_ORG_ID)
            queryClient.setQueryData(billingKey, { address: null })

            const { result } = renderHook(() => useUpdateBillingAddress(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync(buildValidBillingAddressInput())
            ).rejects.toThrow("Stripe is temporarily unavailable")

            expect(queryClient.getQueryState(billingKey)?.isInvalidated ?? false).toBe(false)
        })
    })

    describe("useUpdatePaymentMethod", () => {
        it("posts to /api/subscription/update-payment-method with the paymentMethodId body", async () => {
            const captured = captureNextRequest("POST", UPDATE_PAYMENT_METHOD_URL)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            result.current.mutate("pm_test_visa")

            const request = await captured
            expect(request.method).toBe("POST")
            expect(request.url).toBe(UPDATE_PAYMENT_METHOD_URL)
            expect(request.body).toEqual({ paymentMethodId: "pm_test_visa" })
        })

        it("resolves with the new payment method and invalidates the payment method query key", async () => {
            server.use(updatePaymentMethodSuccess())
            const queryClient = createMutationQueryClient()
            const paymentKey = subscriptionKeys.paymentMethod(TEST_ORG_ID)
            queryClient.setQueryData(paymentKey, { paymentMethod: null })

            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync("pm_test_visa")
            expect(response.success).toBe(true)
            expect(response.paymentMethod).toMatchObject({
                type: "card",
                brand: "visa",
                last4: "4242",
            })

            await waitFor(() => {
                expect(queryClient.getQueryState(paymentKey)?.isInvalidated).toBe(true)
            })
        })

        it("surfaces a 400 server validation message and leaves cache unchanged", async () => {
            server.use(
                updatePaymentMethodWithStatus(400, {
                    message: "Invalid paymentMethodId",
                    details: { field: "paymentMethodId" },
                })
            )
            const queryClient = createMutationQueryClient()
            const paymentKey = subscriptionKeys.paymentMethod(TEST_ORG_ID)
            const cached: { paymentMethod: null } = { paymentMethod: null }
            queryClient.setQueryData(paymentKey, cached)

            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("pm_invalid")).rejects.toThrow(
                "Invalid paymentMethodId"
            )

            expect(queryClient.getQueryData<{ paymentMethod: null }>(paymentKey)).toEqual(cached)
            expect(queryClient.getQueryState(paymentKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 402 payment required without committing optimistic UI changes", async () => {
            server.use(
                updatePaymentMethodWithStatus(402, {
                    message: "Payment authorization failed",
                })
            )
            const queryClient = createMutationQueryClient()
            const paymentKey = subscriptionKeys.paymentMethod(TEST_ORG_ID)
            const cached: { paymentMethod: null } = { paymentMethod: null }
            queryClient.setQueryData(paymentKey, cached)

            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("pm_test_visa")).rejects.toThrow(
                "Payment authorization failed"
            )

            expect(queryClient.getQueryData<{ paymentMethod: null }>(paymentKey)).toEqual(cached)
            expect(queryClient.getQueryState(paymentKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 403 forbidden and does not invalidate the payment method key", async () => {
            server.use(
                updatePaymentMethodWithStatus(403, {
                    message: "Insufficient permissions to update payment method",
                })
            )
            const queryClient = createMutationQueryClient()
            const paymentKey = subscriptionKeys.paymentMethod(TEST_ORG_ID)
            queryClient.setQueryData(paymentKey, { paymentMethod: null })

            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("pm_test_visa")).rejects.toThrow(
                "Insufficient permissions to update payment method"
            )

            expect(queryClient.getQueryState(paymentKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects on 409 conflict (e.g. payment method already attached)", async () => {
            server.use(
                updatePaymentMethodWithStatus(409, {
                    message: "Payment method already attached",
                })
            )
            const queryClient = createMutationQueryClient()

            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("pm_test_visa")).rejects.toThrow(
                "Payment method already attached"
            )
        })

        it("rejects gracefully when Stripe upstream is unavailable (503)", async () => {
            server.use(
                updatePaymentMethodWithStatus(503, {
                    message: "Stripe is temporarily unavailable",
                })
            )
            const queryClient = createMutationQueryClient()
            const paymentKey = subscriptionKeys.paymentMethod(TEST_ORG_ID)
            queryClient.setQueryData(paymentKey, { paymentMethod: null })

            const { result } = renderHook(() => useUpdatePaymentMethod(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync("pm_test_visa")).rejects.toThrow(
                "Stripe is temporarily unavailable"
            )

            expect(queryClient.getQueryState(paymentKey)?.isInvalidated ?? false).toBe(false)
        })
    })

    describe("useUpdateTaxId", () => {
        it("patches /api/organizations/:id/tax-id with nullable tax fields", async () => {
            const captured = captureNextPatchRequest(TAX_ID_URL)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useUpdateTaxId(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            result.current.mutate({ taxIdType: "BE_VAT", taxIdNumber: "BE0123456789" })

            const request = await captured
            expect(request.method).toBe("PATCH")
            expect(request.url).toBe(TAX_ID_URL)
            expect(request.body).toEqual({
                taxIdType: "BE_VAT",
                taxIdNumber: "BE0123456789",
            })
        })

        it("invalidates organization info and organization request data after a tax update", async () => {
            server.use(taxIdSuccess())
            const queryClient = createMutationQueryClient()
            const organizationInfoKey = organizationSettingsKeys.detail(TEST_ORG_ID)
            const requestsKey = ["requests", "organization", TEST_ORG_ID] as const
            queryClient.setQueryData(organizationInfoKey, {
                id: TEST_ORG_ID,
                taxIdType: null,
                taxIdNumber: null,
            })
            queryClient.setQueryData(requestsKey, { rows: [] })

            const { result } = renderHook(() => useUpdateTaxId(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync({
                taxIdType: "BE_VAT",
                taxIdNumber: "BE0123456789",
            })

            await waitFor(() => {
                expect(queryClient.getQueryState(organizationInfoKey)?.isInvalidated).toBe(true)
                expect(queryClient.getQueryState(requestsKey)?.isInvalidated).toBe(true)
            })
        })

        it("updates the setup status cache optimistically while tax ID is saving", async () => {
            const captured = captureNextPatchRequest(TAX_ID_URL)
            const queryClient = createMutationQueryClient()
            const setupQueryKey = organizationSetupKeys.detail(TEST_ORG_ID)
            queryClient.setQueryData(setupQueryKey, setupStatus)

            const { result } = renderHook(() => useUpdateTaxId(TEST_ORG_ID), {
                wrapper: createWrapper(queryClient),
            })

            result.current.mutate({ taxIdType: "BE_VAT", taxIdNumber: "BE0123456789" })

            await waitFor(() => {
                expect(
                    queryClient.getQueryData<OrganizationSetupStatus>(setupQueryKey)?.hasVatConfig
                ).toBe(true)
            })

            await captured
        })
    })
})
