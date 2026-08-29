import { serverEnv } from "@/shared/config/env.server"
import { parseJsonResponse } from "../api/request.response"
import type { RequestsQueryParams } from "../api/requests.api"
import { normalizeRequestDateFilterValues } from "../lib/request-filters"
import { normalizeRequestsPagination } from "../lib/request-pagination"
import type { RequestsListData } from "../model/request"
import { organizationRequestsListResponseSchema } from "../model/schemas/request.schema"

function appendRequestScopeSearchParams(
    searchParams: URLSearchParams,
    params: RequestsQueryParams
): void {
    searchParams.set("scope", params.scope)
    searchParams.set("scopeId", params.scopeId)
}

function buildRequestsPageServerUrl(params: RequestsQueryParams): string {
    const {
        page,
        limit,
        search,
        lifecycleStatus,
        closedReason,
        assignedTo,
        priority,
        fromDate,
        toDate,
    } = params
    const normalizedDateFilters = normalizeRequestDateFilterValues(fromDate, toDate)
    const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })
    appendRequestScopeSearchParams(searchParams, params)

    if (search) searchParams.set("search", search)
    if (lifecycleStatus && lifecycleStatus !== "all" && lifecycleStatus !== "") {
        searchParams.set("lifecycleStatus", lifecycleStatus)
    }
    if (closedReason && closedReason !== "") searchParams.set("closedReason", closedReason)
    if (assignedTo) searchParams.set("assignedTo", assignedTo)
    if (priority) searchParams.set("priority", priority)
    if (normalizedDateFilters.from) searchParams.set("fromDate", normalizedDateFilters.from)
    if (normalizedDateFilters.to) searchParams.set("toDate", normalizedDateFilters.to)

    return `${serverEnv.API_URL}/api/requests?${searchParams}`
}

export async function fetchOrganizationRequestsPageServer(
    params: RequestsQueryParams,
    accessToken: string
): Promise<RequestsListData> {
    const response = await fetch(buildRequestsPageServerUrl(params), {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    })

    const json = await parseJsonResponse(
        response,
        organizationRequestsListResponseSchema,
        "Failed to fetch requests"
    )
    const { requests, pagination } = json.data

    return {
        requests,
        pagination: normalizeRequestsPagination(pagination, params),
    }
}
