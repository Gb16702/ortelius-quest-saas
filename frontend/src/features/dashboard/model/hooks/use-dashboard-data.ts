import { useQuery } from "@tanstack/react-query"
import * as v from "valibot"
import { graphqlQueryData } from "@/shared/api/graphql"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { dashboardKeys } from "../../api/dashboard.query-keys"
import { organizationRequestsAggregationSchema } from "../schemas/dashboard.schema"

const REQUESTS_AGGREGATION_QUERY = `
  query OrganizationRequestsAggregation($organizationSlug: String!, $days: Int) {
    organizationRequestsAggregation(organizationSlug: $organizationSlug, days: $days) {
      services {
        id
        name
        count
        percentage
      }
      cargoTypes {
        id
        name
        count
        percentage
      }
    }
  }
`

const TOP_REQUEST_HANDLERS_STATUSES = ["quoted", "invoiced", "closed"] as const
const TOP_REQUEST_HANDLERS_STATUS_FILTER = TOP_REQUEST_HANDLERS_STATUSES.join(",")
const TOP_REQUEST_HANDLERS_PAGE_SIZE = 100

interface TopRequestHandler {
    member: {
        id: string
        name: string
    }
    requestsHandled: number
}

interface TopRequestHandlerRequest {
    id: string
    updatedAt: string
    assignedTo?: {
        id: string
        name: string
    } | null
}

const dashboardRequestPaginationNumberSchema = v.pipe(
    v.unknown(),
    v.transform((value) =>
        typeof value === "string" && value.trim() !== "" ? Number(value) : value
    ),
    v.number(),
    v.integer(),
    v.minValue(0)
)

const topRequestHandlersResponseSchema = v.looseObject({
    data: v.looseObject({
        requests: v.array(
            v.looseObject({
                id: v.string(),
                updatedAt: v.string(),
                assignedTo: v.optional(
                    v.nullable(
                        v.looseObject({
                            id: v.string(),
                            name: v.string(),
                        })
                    )
                ),
            })
        ),
        pagination: v.looseObject({
            totalPages: v.optional(dashboardRequestPaginationNumberSchema, 1),
        }),
    }),
})

export function useRequestsAggregation(organizationSlug: string, days = 30) {
    return useQuery({
        queryKey: dashboardKeys.requestsAggregation(organizationSlug, days),
        queryFn: async () => {
            const data = await graphqlQueryData(
                {
                    query: REQUESTS_AGGREGATION_QUERY,
                    variables: { organizationSlug, days },
                },
                v.object({
                    organizationRequestsAggregation: organizationRequestsAggregationSchema,
                })
            )

            return data.organizationRequestsAggregation
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })
}

export function useTopRequestHandlers(organizationId: string | undefined, days = 30) {
    return useQuery({
        queryKey: dashboardKeys.topRequestHandlers(organizationId, days),
        queryFn: async () => {
            if (!organizationId) {
                throw new Error("Organization id is required")
            }

            return fetchTopRequestHandlers(organizationId, days)
        },
        enabled: Boolean(organizationId),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })
}

async function fetchTopRequestHandlers(
    organizationId: string,
    days: number
): Promise<TopRequestHandler[]> {
    const firstPage = await fetchTopRequestHandlersPage(organizationId, 1)
    const requestsById = new Map<string, TopRequestHandlerRequest>()

    for (const request of firstPage.requests) {
        requestsById.set(request.id, request)
    }

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const requestPage = await fetchTopRequestHandlersPage(organizationId, page)

        for (const request of requestPage.requests) {
            requestsById.set(request.id, request)
        }
    }

    const periodStart = Date.now() - days * 24 * 60 * 60 * 1000
    const handlersByMemberId = new Map<string, TopRequestHandler>()

    for (const request of requestsById.values()) {
        const updatedAt = Date.parse(request.updatedAt)
        const assignee = request.assignedTo

        if (!assignee || Number.isNaN(updatedAt) || updatedAt < periodStart) {
            continue
        }

        const existingHandler = handlersByMemberId.get(assignee.id)

        if (existingHandler) {
            existingHandler.requestsHandled += 1
            continue
        }

        handlersByMemberId.set(assignee.id, {
            member: {
                id: assignee.id,
                name: assignee.name,
            },
            requestsHandled: 1,
        })
    }

    return [...handlersByMemberId.values()]
        .sort((a, b) => b.requestsHandled - a.requestsHandled)
        .slice(0, 5)
}

async function fetchTopRequestHandlersPage(
    organizationId: string,
    page: number
): Promise<{ requests: TopRequestHandlerRequest[]; totalPages: number }> {
    const searchParams = new URLSearchParams({
        scope: "organization",
        scopeId: organizationId,
        page: page.toString(),
        limit: TOP_REQUEST_HANDLERS_PAGE_SIZE.toString(),
        lifecycleStatus: TOP_REQUEST_HANDLERS_STATUS_FILTER,
    })

    const response = await fetch(`/api/requests?${searchParams}`, {
        credentials: "include",
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error("Request handlers could not be loaded.")
    }

    const parsed = parseSchema(topRequestHandlersResponseSchema, payload)

    return {
        requests: parsed.data.requests,
        totalPages: Math.max(1, parsed.data.pagination.totalPages ?? 1),
    }
}
