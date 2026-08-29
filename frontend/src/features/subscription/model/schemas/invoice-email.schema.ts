import * as v from "valibot"

export const invoiceEmailStateSchema = v.object({
    current: v.nullable(v.pipe(v.string(), v.email())),
})

export const updateInvoiceEmailResponseSchema = v.object({
    email: v.pipe(v.string(), v.email()),
})

export const invoiceEmailFormSchema = v.object({
    email: v.pipe(
        v.string(),
        v.minLength(1, "Email is required"),
        v.maxLength(264, "Email must be 264 characters or fewer"),
        v.email("Enter a valid email address")
    ),
})

export type InvoiceEmailState = v.InferOutput<typeof invoiceEmailStateSchema>
export type UpdateInvoiceEmailResponse = v.InferOutput<typeof updateInvoiceEmailResponseSchema>
export type InvoiceEmailFormData = v.InferOutput<typeof invoiceEmailFormSchema>
