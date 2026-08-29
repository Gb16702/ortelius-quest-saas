import * as v from "valibot"
import { httpUrlSchema } from "@/shared/lib/validation/url.schema"

const emailSchema = v.pipe(v.string(), v.email("Invalid email address"))
const nameSchema = v.pipe(
    v.string(),
    v.minLength(1, "Name is required"),
    v.maxLength(50, "Name must be less than 50 characters")
)

export const contactInfoSchema = v.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    dateRange: v.object({
        from: v.pipe(v.string(), v.minLength(1, "Start date is required")),
        to: v.pipe(v.string(), v.minLength(1, "End date is required")),
    }),
})
export type ContactInfoFormData = v.InferOutput<typeof contactInfoSchema>

export const cargoTypeSchema = v.object({
    selectedCategories: v.pipe(
        v.array(v.string()),
        v.minLength(1, "Select at least one cargo type")
    ),
})
export type CargoTypeFormData = v.InferOutput<typeof cargoTypeSchema>

export const servicesSchema = v.object({
    selectedServices: v.pipe(v.array(v.string()), v.minLength(1, "Select at least one service")),
})
export type ServicesFormData = v.InferOutput<typeof servicesSchema>

const optionalNumberSchema = v.optional(v.pipe(v.number(), v.finite(), v.minValue(0)))

export const sendRequestPayloadSchema = v.object({
    requesterEmail: emailSchema,
    requesterName: v.pipe(v.string(), v.trim(), v.minLength(1)),
    categories: v.pipe(v.array(v.string()), v.minLength(1)),
    services: v.pipe(v.array(v.string()), v.minLength(1)),
    cargoDetails: v.object({
        weight: optionalNumberSchema,
        volume: optionalNumberSchema,
        dimensions: v.object({
            length: optionalNumberSchema,
            width: optionalNumberSchema,
            height: optionalNumberSchema,
        }),
        palletCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
        fragility: v.optional(v.string()),
        options: v.object({
            hazardous: v.boolean(),
            insuranceCoverage: v.boolean(),
            perishableGoods: v.boolean(),
        }),
    }),
    comments: v.optional(v.string()),
    documents: v.array(httpUrlSchema),
    fromDate: v.pipe(v.string(), v.minLength(1)),
    toDate: v.pipe(v.string(), v.minLength(1)),
    receiverOrganizationId: v.nullable(v.string()),
})
export type SendRequestPayload = v.InferOutput<typeof sendRequestPayloadSchema>

export const sendRequestResponseSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
})

const uploadedDocumentsSchema = v.array(httpUrlSchema)

const requestDocumentsUploadEnvelopeSchema = v.looseObject({
    data: v.optional(
        v.looseObject({
            documents: v.optional(uploadedDocumentsSchema),
        })
    ),
    documents: v.optional(uploadedDocumentsSchema),
})

export const requestDocumentsUploadResponseSchema = v.pipe(
    requestDocumentsUploadEnvelopeSchema,
    v.check((json) => {
        const documents = json.data?.documents ?? json.documents
        return documents !== undefined && documents.length > 0
    }, "Upload response did not include uploaded document URLs"),
    v.transform((json) => json.data?.documents ?? json.documents ?? [])
)
