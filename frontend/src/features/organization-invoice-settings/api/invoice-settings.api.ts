import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { parseJsonResponse } from "@/shared/api/http.response"
import type { InvoiceListResponse, StripeInvoiceDetail } from "../model/invoice-settings"
import {
    invoiceListResponseSchema,
    stripeInvoiceDetailSchema,
} from "../model/schemas/invoice.schema"

const INVOICES_PAGE_SIZE = 10

export const settingsInvoiceKeys = {
    all: ["settings", "invoices"] as const,
    list: (organizationId: string) => [...settingsInvoiceKeys.all, organizationId, "list"] as const,
    detail: (organizationId: string, invoiceId: string) =>
        [...settingsInvoiceKeys.all, organizationId, "detail", invoiceId] as const,
}

async function fetchInvoices(startingAfter?: string): Promise<InvoiceListResponse> {
    const params = new URLSearchParams()
    params.set("limit", String(INVOICES_PAGE_SIZE))

    if (startingAfter) {
        params.set("starting_after", startingAfter)
    }

    const res = await fetch(`/api/subscription/invoices?${params}`, { credentials: "include" })

    return parseJsonResponse(res, invoiceListResponseSchema, "Failed to fetch invoices")
}

async function fetchInvoiceDetail(invoiceId: string): Promise<StripeInvoiceDetail> {
    const res = await fetch(`/api/subscription/invoices/${encodeURIComponent(invoiceId)}`, {
        credentials: "include",
    })

    return parseJsonResponse(res, stripeInvoiceDetailSchema, "Failed to fetch invoice detail")
}

export function useInvoices(organizationId: string) {
    return useInfiniteQuery<InvoiceListResponse>({
        queryKey: settingsInvoiceKeys.list(organizationId),
        queryFn: async ({ pageParam }) => {
            return fetchInvoices(pageParam as string | undefined)
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => {
            if (!lastPage.hasMore || lastPage.invoices.length === 0) {
                return undefined
            }
            return lastPage.invoices[lastPage.invoices.length - 1].id
        },
        enabled: !!organizationId,
        staleTime: 30_000,
    })
}

export function useInvoiceDetail(organizationId: string, invoiceId: string) {
    return useQuery({
        queryKey: settingsInvoiceKeys.detail(organizationId, invoiceId),
        queryFn: () => fetchInvoiceDetail(invoiceId),
        enabled: !!organizationId && !!invoiceId,
    })
}
