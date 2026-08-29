import { useQuery } from "@tanstack/react-query"
import type * as v from "valibot"
import { parseJsonResponse } from "../../api/request.response"
import { requestsKeys } from "../../api/requests.api"
import { type invoiceSchema, invoicesResponseSchema } from "../schemas/request.schema"

export type InvoiceStatus = v.InferOutput<typeof invoiceSchema>["status"]

export interface InvoiceLine {
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    category?: string
    unit?: string
}

export interface InvoicePricing {
    lines: InvoiceLine[]
    subtotal: number
    vatPercentage: number
    vatAmount: number
    totalAmount: number
    currency: string
    discountPercentage?: number
    discountAmount?: number
}

export type Invoice = v.InferOutput<typeof invoiceSchema>

export function buildInvoicesByRequestEndpoint(requestId: string): string {
    return `/api/invoices/request/${encodeURIComponent(requestId)}`
}

export function useInvoicesByRequest(requestId: string | undefined) {
    return useQuery({
        queryKey: requestsKeys.invoicesByRequest(requestId),
        queryFn: async () => {
            if (!requestId) return []

            const res = await fetch(buildInvoicesByRequestEndpoint(requestId), {
                credentials: "include",
            })

            return parseJsonResponse(res, invoicesResponseSchema, "Failed to fetch invoices").then(
                (json) => json.data
            )
        },
        enabled: !!requestId,
        staleTime: 1000 * 60 * 5,
    })
}
