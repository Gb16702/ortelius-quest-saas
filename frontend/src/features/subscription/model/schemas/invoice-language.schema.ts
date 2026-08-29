import * as v from "valibot"

export const invoiceLanguageSchema = v.picklist(["en", "fr", "nl", "es"])

export const invoiceLanguageStateSchema = v.object({
    current: v.nullable(invoiceLanguageSchema),
})

export const updateInvoiceLanguageResponseSchema = v.object({
    language: invoiceLanguageSchema,
})

export const invoiceLanguageFormSchema = v.object({
    language: invoiceLanguageSchema,
})

export const INVOICE_LANGUAGE_OPTIONS: ReadonlyArray<{
    value: v.InferOutput<typeof invoiceLanguageSchema>
    label: string
}> = [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
    { value: "nl", label: "Dutch" },
    { value: "es", label: "Spanish" },
]

export type InvoiceLanguage = v.InferOutput<typeof invoiceLanguageSchema>
export type InvoiceLanguageState = v.InferOutput<typeof invoiceLanguageStateSchema>
export type UpdateInvoiceLanguageResponse = v.InferOutput<
    typeof updateInvoiceLanguageResponseSchema
>
export type InvoiceLanguageFormData = v.InferOutput<typeof invoiceLanguageFormSchema>
