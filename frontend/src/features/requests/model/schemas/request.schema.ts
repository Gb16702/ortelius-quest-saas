import * as v from "valibot"
import { SERVICE_TYPES } from "@/entities/service-type"

function preprocess<TSchema extends v.GenericSchema>(
    action: (value: unknown) => unknown,
    schema: TSchema
): v.GenericSchema<unknown, v.InferOutput<TSchema>> {
    return v.pipe(v.unknown(), v.transform(action), schema)
}

export const requestLifecycleStatusSchema = v.picklist([
    "draft",
    "open",
    "quoted",
    "invoiced",
    "closed",
])

export const requestClosedReasonSchema = v.picklist([
    "request_rejected",
    "quote_rejected",
    "cancelled",
    "expired",
])

export const requestPrioritySchema = v.nullable(v.picklist(["high", "medium", "low"]))

export const requestRequesterSchema = v.looseObject({
    id: v.optional(v.nullable(v.string()), null),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.nullable(v.string()), null),
})

export const requestOrganizationSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.nullable(v.string()), null),
})

const paginationNumberSchema = preprocess(
    (value) => {
        if (typeof value === "string" && value.trim() !== "") {
            return Number(value)
        }

        return value
    },
    v.pipe(v.number(), v.integer(), v.minValue(0))
)

export const assignedUserSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    image: v.optional(v.nullable(v.string()), null),
})

export const serviceSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    type: v.picklist(SERVICE_TYPES),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const requestServiceSchema = v.looseObject({
    .../*@valibot-migrate we can't detect if serviceSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    serviceSchema.entries,

    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
})

export const categorySchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const requestCategorySchema = v.looseObject({
    .../*@valibot-migrate we can't detect if categorySchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    categorySchema.entries,

    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
})

function normalizeCargoDetailsOptionsInput(value: unknown): unknown {
    if (!isRecord(value)) return value

    if (value.perishableGoods !== undefined || typeof value.refrigerated !== "boolean") {
        return value
    }

    return {
        ...value,
        perishableGoods: value.refrigerated,
    }
}

export const cargoDetailsOptionsSchema = preprocess(
    normalizeCargoDetailsOptionsInput,
    v.looseObject({
        hazardous: v.optional(v.boolean(), false),
        insuranceCoverage: v.optional(v.boolean(), false),
        perishableGoods: v.optional(v.boolean(), false),
    })
)

export const cargoDetailsDimensionsSchema = v.looseObject({
    length: v.nullable(v.number()),
    width: v.nullable(v.number()),
    height: v.nullable(v.number()),
})

const getEmptyCargoDetailsDimensions = () => ({
    length: null,
    width: null,
    height: null,
})

const getEmptyCargoDetailsOptions = () => ({
    hazardous: false,
    insuranceCoverage: false,
    perishableGoods: false,
})

export const cargoDetailsSchema = v.looseObject({
    weight: v.nullable(v.number()),
    volume: v.nullable(v.number()),
    palletCount: v.nullable(v.number()),
    fragility: v.nullable(v.string()),
    dimensions: preprocess(
        (value) => value ?? getEmptyCargoDetailsDimensions(),
        cargoDetailsDimensionsSchema
    ),
    options: preprocess(
        (value) => value ?? getEmptyCargoDetailsOptions(),
        cargoDetailsOptionsSchema
    ),
})

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeRequestListItemInput(value: unknown): unknown {
    if (!isRecord(value) || value.requester !== undefined) return value

    const requesterName = value.requesterName
    const requesterEmail = value.requesterEmail

    if (typeof requesterName !== "string" || typeof requesterEmail !== "string") return value

    return {
        ...value,
        requester: {
            id: typeof value.requesterId === "string" ? value.requesterId : null,
            name: requesterName,
            email: requesterEmail,
            image: typeof value.requesterImage === "string" ? value.requesterImage : null,
        },
    }
}

const requestListItemBaseObjectSchema = v.looseObject({
    id: v.string(),
    reqNumber: v.string(),
    lifecycleStatus: requestLifecycleStatusSchema,
    closedReason: v.optional(v.nullable(requestClosedReasonSchema), null),
    categories: v.array(v.string()),
    services: v.array(v.string()),
    comments: v.nullable(v.string()),
    fromDate: v.string(),
    toDate: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    conversationId: v.optional(v.nullable(v.string())),
    priority: v.optional(requestPrioritySchema),
    requester: requestRequesterSchema,
    assignedTo: v.optional(v.nullable(assignedUserSchema)),
})

export const organizationRequestListItemSchema = preprocess(
    normalizeRequestListItemInput,
    v.looseObject({
        .../*@valibot-migrate we can't detect if requestListItemBaseObjectSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        requestListItemBaseObjectSchema.entries,

        organization: v.optional(v.nullable(requestOrganizationSchema)),
    })
)

export const personalRequestListItemSchema = preprocess(
    normalizeRequestListItemInput,
    v.looseObject({
        .../*@valibot-migrate we can't detect if requestListItemBaseObjectSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        requestListItemBaseObjectSchema.entries,

        organization: requestOrganizationSchema,
    })
)

export const requestListItemSchema = organizationRequestListItemSchema

export const requestDetailRequesterSchema = v.looseObject({
    .../*@valibot-migrate we can't detect if requestRequesterSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    requestRequesterSchema.entries,

    phone: v.optional(v.nullable(v.string())),
})

export const requestDetailOrganizationSchema = v.looseObject({
    .../*@valibot-migrate we can't detect if requestOrganizationSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    requestOrganizationSchema.entries,

    taxIdType: v.optional(v.nullable(v.string())),
})

export const requestDetailCargoDetailsSchema = v.looseObject({
    .../*@valibot-migrate we can't detect if cargoDetailsSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    cargoDetailsSchema.entries,

    id: v.string(),

    dimensions: preprocess(
        (value) => value ?? getEmptyCargoDetailsDimensions(),
        v.looseObject({
            .../*@valibot-migrate we can't detect if cargoDetailsDimensionsSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
            cargoDetailsDimensionsSchema.entries,

            id: v.optional(v.string()),
        })
    ),
})

export const requestDetailSchema = v.looseObject({
    id: v.string(),
    reqNumber: v.string(),
    requesterId: v.nullable(v.string()),
    receiverOrganizationId: v.string(),
    conversationId: v.optional(v.nullable(v.string())),
    lifecycleStatus: requestLifecycleStatusSchema,
    closedReason: v.optional(v.nullable(requestClosedReasonSchema), null),
    categories: v.array(requestCategorySchema),
    services: v.array(requestServiceSchema),
    extraServices: v.pipe(
        v.optional(v.nullable(v.array(requestServiceSchema))),
        v.transform((value) => value ?? [])
    ),
    cargoDetailsId: v.optional(v.nullable(v.string())),
    comments: v.nullable(v.string()),
    documents: v.pipe(
        v.optional(v.nullable(v.array(v.string()))),
        v.transform((value) => value ?? [])
    ),
    fromDate: v.string(),
    toDate: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    priority: v.optional(requestPrioritySchema),
    requester: requestDetailRequesterSchema,
    organization: requestDetailOrganizationSchema,
    cargoDetails: requestDetailCargoDetailsSchema,
    assignedTo: v.optional(v.nullable(assignedUserSchema)),
})

export const requestsPaginationSchema = v.looseObject({
    total: paginationNumberSchema,
    page: v.optional(paginationNumberSchema, 1),
    limit: v.optional(paginationNumberSchema, 0),
    totalPages: v.optional(paginationNumberSchema, 0),
})

const requestsPaginationResponseSchema = v.looseObject({
    total: paginationNumberSchema,
    page: v.optional(paginationNumberSchema),
    limit: v.optional(paginationNumberSchema),
    totalPages: v.optional(paginationNumberSchema),
})

export const requestsListDataSchema = v.object({
    requests: v.array(requestListItemSchema),
    pagination: requestsPaginationSchema,
})

export const personalRequestsListDataSchema = v.object({
    requests: v.array(personalRequestListItemSchema),
    pagination: requestsPaginationSchema,
})

export const organizationRequestsListDataSchema = v.object({
    requests: v.array(organizationRequestListItemSchema),
    pagination: requestsPaginationSchema,
})

const requestsListResponseDataSchema = v.object({
    requests: v.array(requestListItemSchema),
    pagination: requestsPaginationResponseSchema,
})

const personalRequestsListResponseDataSchema = v.object({
    requests: v.array(personalRequestListItemSchema),
    pagination: requestsPaginationResponseSchema,
})

const organizationRequestsListResponseDataSchema = v.object({
    requests: v.array(organizationRequestListItemSchema),
    pagination: requestsPaginationResponseSchema,
})

export const requestsListResponseSchema = v.looseObject({
    data: requestsListResponseDataSchema,
})

export const personalRequestsListResponseSchema = v.looseObject({
    data: personalRequestsListResponseDataSchema,
})

export const organizationRequestsListResponseSchema = v.looseObject({
    data: organizationRequestsListResponseDataSchema,
})

export const requestDetailResponseSchema = v.looseObject({
    data: requestDetailSchema,
})

export const categoriesResponseSchema = v.looseObject({
    data: v.array(categorySchema),
})

export const servicesResponseSchema = v.looseObject({
    data: v.array(serviceSchema),
})

export const requestMutationResponseSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
})

export const shareToTeamChatResponseSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
    data: v.object({
        conversationId: v.string(),
    }),
})

export const quoteStatusSchema = v.picklist(["draft", "sent", "rejected", "expired"])

export const quoteServiceSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    price: v.number(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    unit: v.optional(v.string()),
    quantity: v.optional(v.number()),
})

export const quoteServiceRefSchema = v.looseObject({
    serviceId: v.string(),
    included: v.boolean(),
    price: v.number(),
})

export const quoteCargoDetailsSchema = v.object({
    .../*@valibot-migrate we can't detect if cargoDetailsSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    cargoDetailsSchema.entries,

    fragility: v.nullable(v.picklist(["fragile", "robust"])),
})

export const quotePricingSchema = v.looseObject({
    vatRate: v.number(),
    totalHT: v.number(),
    totalTTC: v.number(),
    vatAmount: v.number(),
    services: v.optional(v.array(quoteServiceSchema)),
    currency: v.string(),
    discountPercentage: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
})

export const quoteLegalDocumentSchema = v.looseObject({
    id: v.string(),
    label: v.string(),
    originalFilename: v.string(),
    sizeBytes: v.number(),
    downloadUrl: v.string(),
    downloadUrlExpiresAt: v.string(),
})

function normalizeQuoteTimingDateInput(value: unknown): unknown {
    if (typeof value !== "number") return value

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return date.toISOString()
}

function normalizeQuoteTimingInput(value: unknown): unknown {
    if (!isRecord(value)) return value

    return {
        ...value,
        fromDate: normalizeQuoteTimingDateInput(value.fromDate),
        toDate: normalizeQuoteTimingDateInput(value.toDate),
    }
}

function normalizeQuoteDocumentsInput(value: unknown): unknown {
    if (Array.isArray(value)) return value

    if (isRecord(value) && Array.isArray(value.documents)) {
        return value.documents
    }

    return value
}

export const quoteSchema = v.looseObject({
    id: v.string(),
    quoteNumber: v.string(),
    requestId: v.string(),
    organizationId: v.string(),
    createdById: v.string(),
    cargoTypes: v.array(v.string()),
    services: v.array(quoteServiceRefSchema),
    cargoDetails: quoteCargoDetailsSchema,
    timing: v.nullable(
        preprocess(
            normalizeQuoteTimingInput,
            v.looseObject({
                fromDate: v.string(),
                toDate: v.string(),
            })
        )
    ),
    documents: preprocess(normalizeQuoteDocumentsInput, v.array(v.record(v.string(), v.unknown()))),
    comments: v.nullable(
        v.looseObject({
            comment: v.optional(v.string()),
            additionalComment: v.optional(v.string()),
        })
    ),
    pricing: quotePricingSchema,
    description: v.nullable(v.string()),
    terms: v.nullable(v.string()),
    validUntil: v.string(),
    status: quoteStatusSchema,
    version: v.number(),
    respondedAt: v.nullable(v.string()),
    respondedById: v.nullable(v.string()),
    rejectionReason: v.nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    legalDocuments: v.optional(v.array(quoteLegalDocumentSchema), []),
})

export const quotesResponseSchema = v.looseObject({
    data: v.array(quoteSchema),
})

export const quoteMutationResponseSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
})

export const invoiceStatusSchema = v.picklist(["draft", "sent"])

export const invoiceLineSchema = v.looseObject({
    id: v.string(),
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    category: v.optional(v.string()),
    unit: v.optional(v.string()),
})

export const invoicePricingSchema = v.looseObject({
    lines: v.array(invoiceLineSchema),
    subtotal: v.number(),
    vatPercentage: v.number(),
    vatAmount: v.number(),
    totalAmount: v.number(),
    currency: v.string(),
    discountPercentage: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
})

export const invoiceSchema = v.looseObject({
    id: v.string(),
    invoiceNumber: v.string(),
    requestId: v.string(),
    quoteId: v.string(),
    organizationId: v.string(),
    createdById: v.string(),
    pricing: invoicePricingSchema,
    description: v.nullable(v.string()),
    terms: v.nullable(v.string()),
    notes: v.nullable(v.string()),
    issueDate: v.string(),
    dueDate: v.string(),
    status: invoiceStatusSchema,
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const invoicesResponseSchema = v.looseObject({
    data: v.array(invoiceSchema),
})
