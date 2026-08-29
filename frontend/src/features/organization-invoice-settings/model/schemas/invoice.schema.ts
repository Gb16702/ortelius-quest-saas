import * as v from "valibot"
import { nullableHttpUrlSchema } from "@/shared/lib/validation/url.schema"

export const stripeInvoiceStatusSchema = v.picklist([
    "paid",
    "open",
    "draft",
    "void",
    "uncollectible",
])

export const stripeInvoiceSchema = v.looseObject({
    id: v.string(),
    number: v.nullable(v.string()),
    status: stripeInvoiceStatusSchema,
    currency: v.string(),
    amountDue: v.number(),
    amountPaid: v.number(),
    hostedInvoiceUrl: nullableHttpUrlSchema,
    invoicePdf: nullableHttpUrlSchema,
    periodStart: v.number(),
    periodEnd: v.number(),
    created: v.number(),
})

export const stripeInvoiceLineItemSchema = v.looseObject({
    id: v.string(),
    description: v.nullable(v.string()),
    quantity: v.nullable(v.number()),
    unitAmount: v.number(),
    amount: v.number(),
    currency: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
})

export const stripeInvoiceDetailSchema = v.looseObject({
    .../*@valibot-migrate we can't detect if stripeInvoiceSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    stripeInvoiceSchema.entries,

    subtotal: v.number(),
    total: v.number(),
    lineItems: v.array(stripeInvoiceLineItemSchema),
})

export const invoiceListResponseSchema = v.looseObject({
    invoices: v.array(stripeInvoiceSchema),
    hasMore: v.boolean(),
})

export type StripeInvoice = v.InferOutput<typeof stripeInvoiceSchema>
export type StripeInvoiceLineItem = v.InferOutput<typeof stripeInvoiceLineItemSchema>
export type StripeInvoiceDetail = v.InferOutput<typeof stripeInvoiceDetailSchema>
export type InvoiceListResponse = v.InferOutput<typeof invoiceListResponseSchema>
export type InvoiceStatus = v.InferOutput<typeof stripeInvoiceStatusSchema>
