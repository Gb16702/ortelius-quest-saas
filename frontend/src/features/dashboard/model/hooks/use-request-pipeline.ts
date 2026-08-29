import { useQuery } from "@tanstack/react-query"
import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { dashboardKeys } from "../../api/dashboard.query-keys"

export const REQUEST_PIPELINE_STATUSES = ["open", "quoted", "invoiced", "draft", "closed"] as const

export type RequestPipelineStatus = (typeof REQUEST_PIPELINE_STATUSES)[number]

export interface RequestPipelineSegment {
    status: RequestPipelineStatus
    count: number
    share: number
}

interface RequestPipelineData {
    total: number
    segments: RequestPipelineSegment[]
}

interface RequestPipelineRequest {
    id: string
    lifecycleStatus: RequestPipelineStatus
}

const REQUEST_PIPELINE_PAGE_SIZE = 100
const REQUEST_PIPELINE_STATUS_FILTER = REQUEST_PIPELINE_STATUSES.join(",")

const requestPipelinePaginationNumberSchema = v.pipe(
    v.unknown(),
    v.transform((value) =>
        typeof value === "string" && value.trim() !== "" ? Number(value) : value
    ),
    v.number(),
    v.integer(),
    v.minValue(0)
)

const requestPipelineResponseSchema = v.looseObject({
    data: v.looseObject({
        requests: v.array(
            v.looseObject({
                id: v.string(),
                lifecycleStatus: v.picklist(REQUEST_PIPELINE_STATUSES),
            })
        ),
        pagination: v.looseObject({
            page: v.optional(requestPipelinePaginationNumberSchema, 1),
            total: requestPipelinePaginationNumberSchema,
            totalPages: v.optional(requestPipelinePaginationNumberSchema, 1),
        }),
    }),
})

export function useRequestPipeline(organizationId: string | undefined) {
    return useQuery({
        queryKey: dashboardKeys.requestPipeline(organizationId),
        queryFn: async () => {
            if (!organizationId) {
                throw new Error("Organization id is required")
            }

            return fetchRequestPipeline(organizationId)
        },
        enabled: Boolean(organizationId),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })
}

async function fetchRequestPipeline(organizationId: string): Promise<RequestPipelineData> {
    const firstPage = await fetchRequestPipelinePage(organizationId, 1)
    const requestsById = new Map<string, RequestPipelineRequest>()

    for (const request of firstPage.requests) {
        requestsById.set(request.id, request)
    }

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const requestPage = await fetchRequestPipelinePage(organizationId, page)

        for (const request of requestPage.requests) {
            requestsById.set(request.id, request)
        }
    }

    const counts = REQUEST_PIPELINE_STATUSES.map((status) => ({
        status,
        count: 0,
    }))

    for (const request of requestsById.values()) {
        const statusCount = counts.find((item) => item.status === request.lifecycleStatus)

        if (statusCount) {
            statusCount.count += 1
        }
    }

    const total = counts.reduce((sum, item) => sum + item.count, 0)

    return {
        total,
        segments: counts
            .filter((item) => item.count > 0)
            .map((item) => ({
                ...item,
                share: total > 0 ? (item.count / total) * 100 : 0,
            })),
    }
}

async function fetchRequestPipelinePage(
    organizationId: string,
    page: number
): Promise<{ requests: RequestPipelineRequest[]; totalPages: number }> {
    const searchParams = new URLSearchParams({
        scope: "organization",
        scopeId: organizationId,
        page: page.toString(),
        limit: REQUEST_PIPELINE_PAGE_SIZE.toString(),
        lifecycleStatus: REQUEST_PIPELINE_STATUS_FILTER,
    })

    const response = await fetch(`/api/requests?${searchParams}`, {
        credentials: "include",
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error("Requests could not be loaded.")
    }

    const parsed = parseSchema(requestPipelineResponseSchema, payload)

    return {
        requests: parsed.data.requests,
        totalPages: Math.max(1, parsed.data.pagination.totalPages),
    }
}
