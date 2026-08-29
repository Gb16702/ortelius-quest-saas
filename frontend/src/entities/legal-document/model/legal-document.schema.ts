import * as v from "valibot"
import { httpUrlSchema } from "@/shared/lib/validation/url.schema"

export const legalDocumentSchema = v.object({
    id: v.pipe(v.string(), v.uuid()),
    organizationId: v.string(),
    label: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
    sizeBytes: v.pipe(v.number(), v.integer(), v.gtValue(0)),
    mimeType: v.literal("application/pdf"),
    originalFilename: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
    uploadedById: v.string(),
    uploadedByName: v.nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const listLegalDocumentsResponseSchema = v.object({
    documents: v.array(legalDocumentSchema),
    totalSizeBytes: v.pipe(v.number(), v.integer(), v.minValue(0)),
    quotaBytes: v.pipe(v.number(), v.integer(), v.gtValue(0)),
})

export const uploadLegalDocumentMetadataSchema = v.object({
    label: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(255))),
})

export const legalDocumentLabelSchema = v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Label required."),
    v.maxLength(255, "Label must be 255 characters or fewer.")
)

export const updateLegalDocumentSchema = v.object({
    label: legalDocumentLabelSchema,
})

export const downloadUrlResponseSchema = v.object({
    url: httpUrlSchema,
    expiresAt: v.string(),
})

export const legalDocumentsApiResponseSchema = v.looseObject({
    success: v.literal(true),
    message: v.optional(v.string()),
})

const legalDocumentEnvelopeResponseSchema = v.object({
    .../*@valibot-migrate we can't detect if legalDocumentsApiResponseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    legalDocumentsApiResponseSchema.entries,

    data: legalDocumentSchema,
})

const legalDocumentsApiErrorResponseSchema = v.looseObject({
    success: v.optional(v.literal(false)),
    message: v.optional(v.string()),
    details: v.optional(v.unknown()),
})

const legalDocumentsDataEnvelopeResponseSchema = v.object({
    .../*@valibot-migrate we can't detect if legalDocumentsApiResponseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    legalDocumentsApiResponseSchema.entries,

    data: v.optional(v.unknown()),
})

export const legalDocumentMutationResponseSchema = v.union([
    v.pipe(
        legalDocumentEnvelopeResponseSchema,
        v.transform((payload) => payload.data)
    ),
    legalDocumentSchema,
])

export function getLegalDocumentsErrorMessage(payload: unknown, fallback: string): string {
    const result = v.safeParse(legalDocumentsApiErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.output.message || fallback
}

export function unwrapLegalDocumentsApiData(payload: unknown, fallback: string): unknown {
    const errorResult = v.safeParse(legalDocumentsApiErrorResponseSchema, payload)
    if (errorResult.success && errorResult.output.success === false) {
        throw new Error(getLegalDocumentsErrorMessage(payload, fallback))
    }

    const envelopeResult = v.safeParse(legalDocumentsDataEnvelopeResponseSchema, payload)

    if (envelopeResult.success && envelopeResult.output.data !== undefined) {
        return envelopeResult.output.data
    }

    return payload
}
