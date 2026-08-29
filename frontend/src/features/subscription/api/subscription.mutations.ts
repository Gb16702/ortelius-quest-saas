import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as v from "valibot"
import {
    applyOptimisticOrganizationSetupStatusPatch,
    invalidateOrganizationSetupStatus,
    type OrganizationInfo,
    organizationSettingsKeys,
    restoreOrganizationSetupStatus,
} from "@/entities/organization"
import { parseJsonResponse, readJsonResponse } from "@/shared/api/http.response"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { InvoiceEmailState } from "../model/schemas/invoice-email.schema"
import {
    type UpdateInvoiceEmailResponse,
    updateInvoiceEmailResponseSchema,
} from "../model/schemas/invoice-email.schema"
import type { InvoiceLanguageState } from "../model/schemas/invoice-language.schema"
import {
    type InvoiceLanguage,
    type UpdateInvoiceLanguageResponse,
    updateInvoiceLanguageResponseSchema,
} from "../model/schemas/invoice-language.schema"
import {
    type BillingAddressResponse,
    cancelPendingChangeResponseSchema,
    cancelSubscriptionInputSchema,
    cancelSubscriptionResponseSchema,
    changePlanResponseSchema,
    confirmSubscribeResponseSchema,
    previewChangeResponseSchema,
    resumeSubscriptionResponseSchema,
    setupIntentResponseSchema,
    subscribeResponseSchema,
    subscriptionErrorResponseSchema,
    updateBillingAddressInputSchema,
    updateBillingAddressResponseSchema,
    updatePaymentMethodResponseSchema,
} from "../model/schemas/subscription-api.schema"
import type {
    CancelPendingChangeResponse,
    CancelSubscriptionInput,
    CancelSubscriptionResponse,
    ChangePlanResponse,
    ConfirmSubscribeResponse,
    PreviewChangeResponse,
    ResumeSubscriptionResponse,
    SetupIntentResponse,
    SubscribeResponse,
    UpdateBillingAddressInput,
    UpdateBillingAddressResponse,
    UpdatePaymentMethodResponse,
} from "../model/subscription"
import { plansKeys, subscriptionKeys } from "./subscription.query-keys"

function getSubscriptionErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(subscriptionErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

async function parseSubscriptionResponse<T>(
    response: Response,
    schema: v.GenericSchema<unknown, T>,
    fallback: string
): Promise<T> {
    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getSubscriptionErrorMessage(json, fallback))
    }
    return parseSchema(schema, json)
}

const organizationPatchResultSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
})

type OrganizationPatchResult = v.InferOutput<typeof organizationPatchResultSchema>

async function parseOrganizationMutationResponse(
    res: Response,
    fallback: string
): Promise<OrganizationPatchResult> {
    return parseJsonResponse(res, organizationPatchResultSchema, fallback)
}

async function postPreviewChange(priceId: string): Promise<PreviewChangeResponse> {
    const res = await fetch(`/api/subscription/preview-change`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
    })
    return parseSubscriptionResponse(res, previewChangeResponseSchema, "Failed to preview change")
}

async function postChangePlan(priceId: string): Promise<ChangePlanResponse> {
    const res = await fetch(`/api/subscription/change-plan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
    })
    return parseSubscriptionResponse(res, changePlanResponseSchema, "Failed to change plan")
}

async function postSubscribe(priceId: string): Promise<SubscribeResponse> {
    const res = await fetch(`/api/subscription/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
    })
    return parseSubscriptionResponse(res, subscribeResponseSchema, "Failed to start subscription")
}

async function postConfirmSubscribe(subscriptionId: string): Promise<ConfirmSubscribeResponse> {
    const res = await fetch(`/api/subscription/confirm-subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
    })
    return parseSubscriptionResponse(
        res,
        confirmSubscribeResponseSchema,
        "Failed to finalize subscription"
    )
}

async function postCancelSubscription(
    input: CancelSubscriptionInput
): Promise<CancelSubscriptionResponse> {
    const parsedInput = parseSchema(cancelSubscriptionInputSchema, input)
    const res = await fetch(`/api/subscription/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedInput),
    })
    return parseSubscriptionResponse(
        res,
        cancelSubscriptionResponseSchema,
        "Failed to cancel subscription"
    )
}

async function postResumeSubscription(): Promise<ResumeSubscriptionResponse> {
    const res = await fetch(`/api/subscription/resume`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    })
    return parseSubscriptionResponse(
        res,
        resumeSubscriptionResponseSchema,
        "Failed to resume subscription"
    )
}

async function postCancelPendingChange(): Promise<CancelPendingChangeResponse> {
    const res = await fetch(`/api/subscription/cancel-pending-change`, {
        method: "POST",
        credentials: "include",
    })
    return parseSubscriptionResponse(
        res,
        cancelPendingChangeResponseSchema,
        "Failed to cancel pending plan change"
    )
}

async function postSetupIntent(): Promise<SetupIntentResponse> {
    const res = await fetch(`/api/subscription/setup-intent`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    })
    return parseSubscriptionResponse(
        res,
        setupIntentResponseSchema,
        "Failed to prepare payment setup"
    )
}

async function postUpdatePaymentMethod(
    paymentMethodId: string
): Promise<UpdatePaymentMethodResponse> {
    const res = await fetch(`/api/subscription/update-payment-method`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
    })
    return parseSubscriptionResponse(
        res,
        updatePaymentMethodResponseSchema,
        "Failed to update payment method"
    )
}

async function putBillingAddress(
    input: UpdateBillingAddressInput
): Promise<UpdateBillingAddressResponse> {
    const parsedInput = parseSchema(updateBillingAddressInputSchema, input)
    const res = await fetch(`/api/subscription/billing-address`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedInput),
    })
    return parseSubscriptionResponse(
        res,
        updateBillingAddressResponseSchema,
        "Failed to update billing address"
    )
}

async function putInvoiceEmail(email: string): Promise<UpdateInvoiceEmailResponse> {
    const res = await fetch(`/api/subscription/invoice-email`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    })
    return parseSubscriptionResponse(
        res,
        updateInvoiceEmailResponseSchema,
        "Failed to update invoice email"
    )
}

async function putInvoiceLanguage(
    language: InvoiceLanguage
): Promise<UpdateInvoiceLanguageResponse> {
    const res = await fetch(`/api/subscription/invoice-language`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
    })
    return parseSubscriptionResponse(
        res,
        updateInvoiceLanguageResponseSchema,
        "Failed to update invoice language"
    )
}

export function usePreviewChange() {
    return useMutation({
        mutationFn: (priceId: string) => postPreviewChange(priceId),
    })
}

export function useChangePlan(organizationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (priceId: string) => postChangePlan(priceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.current(organizationId) })
            queryClient.invalidateQueries({ queryKey: plansKeys.all })
        },
    })
}

export function useSubscribe() {
    return useMutation({
        mutationFn: (priceId: string) => postSubscribe(priceId),
    })
}

export function useConfirmSubscribe(organizationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (subscriptionId: string) => postConfirmSubscribe(subscriptionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.current(organizationId) })
            queryClient.invalidateQueries({ queryKey: plansKeys.all })
        },
    })
}

export function useCancelSubscription(organizationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: CancelSubscriptionInput) => postCancelSubscription(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.current(organizationId) })
        },
    })
}

export function useResumeSubscription(organizationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => postResumeSubscription(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.current(organizationId) })
        },
    })
}

export function useCancelPendingChange(organizationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => postCancelPendingChange(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.current(organizationId) })
        },
    })
}

export function useSetupIntent() {
    return useMutation({
        mutationFn: () => postSetupIntent(),
    })
}

export function useUpdatePaymentMethod(organizationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (paymentMethodId: string) => postUpdatePaymentMethod(paymentMethodId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: subscriptionKeys.paymentMethod(organizationId),
            })
        },
    })
}

export function useUpdateBillingAddress(organizationId: string) {
    const queryClient = useQueryClient()
    const queryKey = subscriptionKeys.billingAddress(organizationId)

    return useMutation({
        mutationFn: (input: UpdateBillingAddressInput) => putBillingAddress(input),
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<BillingAddressResponse>(queryKey)

            queryClient.setQueryData<BillingAddressResponse>(queryKey, {
                address: {
                    ...input.address,
                    line2: input.address.line2 ?? null,
                    state: input.address.state ?? null,
                },
            })

            return { previous }
        },
        onError: (_error, _input, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
        },
    })
}

export function useUpdateInvoiceEmail(organizationId: string) {
    const queryClient = useQueryClient()
    const queryKey = subscriptionKeys.invoiceEmail(organizationId)

    return useMutation({
        mutationFn: (email: string) => putInvoiceEmail(email),
        onMutate: async (email) => {
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<InvoiceEmailState>(queryKey)

            queryClient.setQueryData<InvoiceEmailState>(queryKey, { current: email })

            return { previous }
        },
        onError: (_error, _email, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
        },
    })
}

export function useUpdateInvoiceLanguage(organizationId: string) {
    const queryClient = useQueryClient()
    const queryKey = subscriptionKeys.invoiceLanguage(organizationId)

    return useMutation({
        mutationFn: (language: InvoiceLanguage) => putInvoiceLanguage(language),
        onMutate: async (language) => {
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<InvoiceLanguageState>(queryKey)

            queryClient.setQueryData<InvoiceLanguageState>(queryKey, { current: language })

            return { previous }
        },
        onError: (_error, _language, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
        },
    })
}

export function useUpdateTaxId(orgId: string) {
    const queryClient = useQueryClient()
    const queryKey = organizationSettingsKeys.detail(orgId)

    return useMutation({
        mutationFn: async (data: { taxIdType: string | null; taxIdNumber: string | null }) => {
            const res = await fetch(`/api/organizations/${orgId}/tax-id`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            return parseOrganizationMutationResponse(res, "Failed to update tax ID")
        },
        onMutate: async (data) => {
            await queryClient.cancelQueries({ queryKey })
            const previousOrganizationInfo = queryClient.getQueryData<OrganizationInfo>(queryKey)

            queryClient.setQueryData<OrganizationInfo>(queryKey, (current) =>
                current
                    ? {
                          ...current,
                          taxIdNumber: data.taxIdNumber,
                          taxIdType: data.taxIdType,
                      }
                    : current
            )

            const setupStatusContext = await applyOptimisticOrganizationSetupStatusPatch(
                queryClient,
                orgId,
                {
                    hasVatConfig: Boolean(data.taxIdType && data.taxIdNumber),
                }
            )

            return { previousOrganizationInfo, setupStatusContext }
        },
        onError: (_error, _data, context) => {
            if (context?.previousOrganizationInfo) {
                queryClient.setQueryData(queryKey, context.previousOrganizationInfo)
            }
            restoreOrganizationSetupStatus(queryClient, orgId, context?.setupStatusContext)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
            queryClient.invalidateQueries({ queryKey: ["requests", "organization", orgId] })
        },
        onSettled: () => {
            invalidateOrganizationSetupStatus(queryClient, orgId)
        },
    })
}
