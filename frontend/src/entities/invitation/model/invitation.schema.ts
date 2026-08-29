import * as v from "valibot"
import { AssignableRoleSchema } from "@/entities/access/@x/invitation"
import { parseEnvelopeData } from "@/shared/api/http.response"

const nullableStringSchema = v.nullable(v.string())
const optionalNullableStringSchema = v.optional(v.nullable(v.string()))

const totalSchema = v.pipe(
    v.optional(v.nullable(v.union([v.number(), v.string()]))),
    v.transform((value) => {
        const parsed = Number.parseInt(String(value ?? 0), 10)
        return Number.isFinite(parsed) ? parsed : 0
    })
)

const paginationSchema = v.object({
    total: v.number(),
    page: v.number(),
    limit: v.number(),
    totalPages: v.number(),
})

export const invitationListStatusSchema = v.picklist([
    "pending",
    "accepted",
    "canceled",
    "expired",
    "archived",
])

export const invitationSchema = v.looseObject({
    id: v.string(),
    organizationId: v.string(),
    email: v.string(),
    role: v.string(),
    status: invitationListStatusSchema,
    expiresAt: v.string(),
    inviterName: v.string(),
    inviterId: v.optional(v.string()),
    canceledAt: optionalNullableStringSchema,
    archivedAt: optionalNullableStringSchema,
    lastSentAt: optionalNullableStringSchema,
    archived: v.optional(v.boolean()),
    createdAt: v.optional(v.string()),
})

export const inviteFormSchema = v.object({
    email: v.string(),
    role: AssignableRoleSchema,
})

const invitationsResponseDataSchema = v.looseObject({
    invitations: v.pipe(
        v.optional(v.nullable(v.array(invitationSchema))),
        v.transform((value) => value ?? [])
    ),
    total: totalSchema,
})

export const invitationsQueryDataSchema = v.object({
    invitations: v.array(invitationSchema),
    pagination: v.optional(paginationSchema),
})

export const invitationIdSchema = v.pipe(
    v.string(),
    v.regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid identifier format")
)

export const emailExistsResponseSchema = v.object({
    exists: v.optional(v.boolean()),
})

export const invitationLinkStatusSchema = v.picklist(["pending", "accepted", "expired"])

export const inviterDataSchema = v.object({
    id: nullableStringSchema,
    name: nullableStringSchema,
    email: nullableStringSchema,
    image: nullableStringSchema,
    dominantColor: nullableStringSchema,
})

export const invitationApiDataSchema = v.object({
    id: v.string(),
    email: v.pipe(v.string(), v.email()),
    role: AssignableRoleSchema,
    status: invitationLinkStatusSchema,
    expiresAt: v.string(),
    organization: v.looseObject({
        id: v.string(),
        name: v.string(),
        logo: optionalNullableStringSchema,
        brandColor: optionalNullableStringSchema,
    }),
    inviter: v.optional(v.nullable(inviterDataSchema)),
    memberCount: v.optional(v.number()),
    userExists: v.optional(v.boolean(), false),
})

export const invitationLookupResponseSchema = v.object({
    success: v.boolean(),
    data: v.optional(invitationApiDataSchema),
    message: v.optional(v.string()),
})

export const acceptInvitationResponseSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
    data: v.optional(
        v.object({
            organization: v.optional(
                v.object({
                    slug: optionalNullableStringSchema,
                })
            ),
        })
    ),
})

interface PaginationInput {
    page: number
    limit: number
}

export function parseInvitationsResponse(payload: unknown, pagination: PaginationInput) {
    const data = parseEnvelopeData(invitationsResponseDataSchema, payload)
    const total = data.total ?? 0

    return v.parse(invitationsQueryDataSchema, {
        invitations: data.invitations,
        pagination: {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        },
    })
}

export type Invitation = v.InferOutput<typeof invitationSchema>
export type InvitationApiData = v.InferOutput<typeof invitationApiDataSchema>
export type InvitationData = InvitationApiData & {
    isExpired: boolean
}
export type InvitationsQueryData = v.InferOutput<typeof invitationsQueryDataSchema>
export type InviteForm = v.InferOutput<typeof inviteFormSchema>
export type InviterData = v.InferOutput<typeof inviterDataSchema>
