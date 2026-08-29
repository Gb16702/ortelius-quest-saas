import * as v from "valibot"
import { RoleSchema } from "@/entities/access/@x/member"
import { parseEnvelopeData } from "@/shared/api/http.response"

const nullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

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

export const organizationMemberSchema = v.looseObject({
    id: v.string(),
    role: v.string(),
    createdAt: v.string(),
    lastSeenAt: nullableStringSchema,
    user: v.looseObject({
        id: v.string(),
        name: v.string(),
        email: v.optional(v.string(), ""),
        image: nullableStringSchema,
        twoFactorEnabled: v.pipe(
            v.optional(v.nullable(v.boolean())),
            v.transform((value) => value ?? null)
        ),
    }),
})

const membersResponseDataSchema = v.looseObject({
    members: v.pipe(
        v.optional(v.nullable(v.array(organizationMemberSchema))),
        v.transform((value) => value ?? [])
    ),
    total: totalSchema,
})

export const membersQueryDataSchema = v.object({
    members: v.array(organizationMemberSchema),
    pagination: v.optional(paginationSchema),
})

export const memberProfileUserSchema = v.pipe(
    v.looseObject({
        id: v.string(),
        name: v.string(),
        email: v.string(),
        image: nullableStringSchema,
        dominantColor: nullableStringSchema,
        createdAt: v.string(),
    }),
    v.transform((user) => ({
        ...user,
        image: user.image ?? null,
        dominantColor: user.dominantColor ?? null,
    }))
)

export const memberProfileMembershipSchema = v.looseObject({
    id: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    role: RoleSchema,
    joinedAt: v.string(),
})

export const memberProfileAssignedRequestSchema = v.looseObject({
    id: v.string(),
    requestNumber: v.string(),
    lifecycleStatus: v.string(),
    closedReason: v.optional(v.nullable(v.string()), null),
    categories: v.array(v.string()),
    services: v.array(v.string()),
    createdAt: v.string(),
})

export const memberProfileResponseSchema = v.looseObject({
    user: memberProfileUserSchema,
    membership: memberProfileMembershipSchema,
    assignedRequests: v.array(memberProfileAssignedRequestSchema),
})

interface PaginationInput {
    page: number
    limit: number
}

export function parseMembersResponse(payload: unknown, pagination: PaginationInput) {
    const data = parseEnvelopeData(membersResponseDataSchema, payload)
    const total = data.total ?? 0

    return v.parse(membersQueryDataSchema, {
        members: data.members,
        pagination: {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        },
    })
}

export function parseMemberProfileResponse(payload: unknown) {
    return parseEnvelopeData(memberProfileResponseSchema, payload)
}

export type MemberProfileAssignedRequest = v.InferOutput<typeof memberProfileAssignedRequestSchema>
export type MemberProfileMembership = v.InferOutput<typeof memberProfileMembershipSchema>
export type MemberProfileResponse = v.InferOutput<typeof memberProfileResponseSchema>
export type MemberProfileUser = v.InferOutput<typeof memberProfileUserSchema>
export type MembersQueryData = v.InferOutput<typeof membersQueryDataSchema>
export type OrganizationMember = v.InferOutput<typeof organizationMemberSchema>
