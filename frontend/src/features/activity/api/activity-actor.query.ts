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

const activityActorLookupMemberSchema = v.looseObject({
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

const actorLookupResponseDataSchema = v.looseObject({
    members: v.pipe(
        v.optional(v.nullable(v.array(activityActorLookupMemberSchema))),
        v.transform((value) => value ?? [])
    ),
    total: totalSchema,
})

const activityActorLookupDataSchema = v.object({
    members: v.array(activityActorLookupMemberSchema),
    pagination: v.optional(
        v.object({
            total: v.number(),
            page: v.number(),
            limit: v.number(),
            totalPages: v.number(),
        })
    ),
})

export type ActivityActorLookupMember = v.InferOutput<typeof activityActorLookupMemberSchema>
export type ActivityActorLookupData = v.InferOutput<typeof activityActorLookupDataSchema>

interface PaginationInput {
    page: number
    limit: number
}

interface ActorSearchParams {
    page: number
    limit: number
    search: string
    role: string
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000
const DEFAULT_CACHE_TIME = 10 * 60 * 1000

const activityActorLookupKeys = {
    lists: (organizationId: string) => ["members", organizationId] as const,
    list: (organizationId: string, params: ActorSearchParams) =>
        [
            ...activityActorLookupKeys.lists(organizationId),
            {
                page: params.page,
                limit: params.limit,
                search: params.search,
                role: params.role,
            },
        ] as const,
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

function parseActivityActorLookupResponse(
    payload: unknown,
    pagination: PaginationInput
): ActivityActorLookupData {
    const data = parseEnvelopeData(actorLookupResponseDataSchema, payload)
    const total = data.total ?? 0

    return v.parse(activityActorLookupDataSchema, {
        members: data.members,
        pagination: {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        },
    })
}

export function useActivityActorSearch(
    orgId: string,
    params: ActorSearchParams,
    options?: { enabled?: boolean }
) {
    const { page, limit, search, role } = params

    return useQuery<ActivityActorLookupData>({
        queryKey: activityActorLookupKeys.list(orgId, { page, limit, search, role }),
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

            return parseActivityActorLookupResponse(json, { page, limit })
        },
        placeholderData: keepPreviousData,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
        enabled: !!orgId && (options?.enabled ?? true),
        refetchOnWindowFocus: false,
    })
}
