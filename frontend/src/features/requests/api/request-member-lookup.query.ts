import { keepPreviousData, useQuery } from "@tanstack/react-query"
import * as v from "valibot"
import { createApiError, readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

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

const requestMemberLookupMemberSchema = v.looseObject({
    id: v.string(),
    role: v.string(),
    createdAt: v.string(),
    user: v.looseObject({
        id: v.string(),
        name: v.string(),
        email: v.string(),
        image: nullableStringSchema,
        twoFactorEnabled: v.pipe(
            v.optional(v.nullable(v.boolean())),
            v.transform((value) => value ?? null)
        ),
    }),
})

const membersResponseDataSchema = v.looseObject({
    members: v.pipe(
        v.optional(v.nullable(v.array(requestMemberLookupMemberSchema))),
        v.transform((value) => value ?? [])
    ),
    total: totalSchema,
})

const requestMemberLookupDataSchema = v.object({
    members: v.array(requestMemberLookupMemberSchema),
    pagination: v.optional(
        v.object({
            total: v.number(),
            page: v.number(),
            limit: v.number(),
            totalPages: v.number(),
        })
    ),
})

export type RequestMemberLookupMember = v.InferOutput<typeof requestMemberLookupMemberSchema>
export type RequestMemberLookupData = v.InferOutput<typeof requestMemberLookupDataSchema>

interface PaginationInput {
    page: number
    limit: number
}

interface MemberSearchParams {
    page: number
    limit: number
    search: string
    role: string
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000
const DEFAULT_CACHE_TIME = 10 * 60 * 1000

const requestMemberLookupKeys = {
    lists: (organizationId: string) => ["members", organizationId] as const,
    list: (organizationId: string, params: MemberSearchParams) =>
        [
            ...requestMemberLookupKeys.lists(organizationId),
            {
                page: params.page,
                limit: params.limit,
                search: params.search,
                role: params.role,
            },
        ] as const,
    directory: (organizationId: string) => ["organization-members", organizationId] as const,
}

function parseEnvelopeData<TOutput>(
    schema: v.GenericSchema<unknown, TOutput>,
    payload: unknown
): TOutput {
    const envelopeResult = v.safeParse(
        v.looseObject({
            data: schema,
        }),
        payload
    )

    if (envelopeResult.success) {
        return envelopeResult.output.data
    }

    return parseSchema(schema, payload)
}

function parseRequestMembersResponse(
    payload: unknown,
    pagination: PaginationInput
): RequestMemberLookupData {
    const data = parseEnvelopeData(membersResponseDataSchema, payload)
    const total = data.total ?? 0

    return v.parse(requestMemberLookupDataSchema, {
        members: data.members,
        pagination: {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        },
    })
}

export function useRequestMemberSearch(
    orgId: string,
    params: MemberSearchParams,
    options?: { enabled?: boolean }
) {
    const { page, limit, search, role } = params

    return useQuery<RequestMemberLookupData>({
        queryKey: requestMemberLookupKeys.list(orgId, { page, limit, search, role }),
        queryFn: async () => {
            const urlParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            })

            if (search) urlParams.set("search", search)
            if (role && role !== "all" && role !== "" && role !== "undefined") {
                urlParams.set("role", role)
            }

            const res = await fetch(`/api/organizations/${orgId}/members?${urlParams}`, {
                credentials: "include",
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw createApiError(res.status, json, "Failed to fetch members")
            }

            return parseRequestMembersResponse(json, { page, limit })
        },
        placeholderData: keepPreviousData,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
        enabled: !!orgId && (options?.enabled ?? true),
        refetchOnWindowFocus: false,
    })
}

export function useRequestAssignableMembers(orgId: string, options?: { enabled?: boolean }) {
    return useQuery<RequestMemberLookupMember[]>({
        queryKey: requestMemberLookupKeys.directory(orgId),
        queryFn: async () => {
            const urlParams = new URLSearchParams({
                page: "1",
                limit: "100",
            })

            const res = await fetch(`/api/organizations/${orgId}/members?${urlParams}`, {
                credentials: "include",
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw createApiError(res.status, json, "Failed to fetch organization members")
            }

            return parseRequestMembersResponse(json, { page: 1, limit: 100 }).members
        },
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
        enabled: !!orgId && (options?.enabled ?? true),
        refetchOnWindowFocus: false,
    })
}
