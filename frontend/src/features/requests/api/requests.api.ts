import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"
import { DEFAULT_PAGE_SIZE } from "@/shared/lib/url.state"
import { normalizeRequestDateFilterValues } from "../lib/request-filters"
import { normalizeRequestsPagination } from "../lib/request-pagination"
import { compoundParsers, FILTER_STATES } from "../lib/request-url.state"
import type { RequestsListData } from "../model/request"
import {
    organizationRequestsListResponseSchema,
    personalRequestsListResponseSchema,
    requestDetailResponseSchema,
} from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"

export type {
    AssignedUser,
    RequestClosedReason,
    RequestLifecycleStatus,
    RequestPriority,
    UserRequest,
} from "../model/request"

const DEFAULT_STALE_TIME = 5 * 60 * 1000
const DEFAULT_CACHE_TIME = 10 * 60 * 1000

export type RequestsListScope = "organization" | "personal"

export interface OrganizationRequestScopeKey {
    scope: "organization"
    scopeId: string
}

export interface PersonalRequestScopeKey {
    scope: "personal"
    scopeId: string
}

export type RequestScopeKey = OrganizationRequestScopeKey | PersonalRequestScopeKey

export type RequestsQueryParams = RequestScopeKey & {
    page: number
    limit: number
    search: string
    lifecycleStatus: string
    closedReason: string
    assignedTo: string
    priority: string
    fromDate: string
    toDate: string
}

export interface InitialRequestsListData {
    queryParams: RequestsQueryParams
    data: RequestsListData
    fetchedAt: number
}

export interface OrganizationRequestScopeSource {
    scope: "organization"
    organizationId?: string | null
}

export interface PersonalRequestScopeSource {
    scope: "personal"
    userId?: string | null
}

export type RequestScopeSource = OrganizationRequestScopeSource | PersonalRequestScopeSource

export function createRequestScopeKey(source: RequestScopeSource): RequestScopeKey | null {
    if (source.scope === "organization") {
        return source.organizationId
            ? { scope: "organization", scopeId: source.organizationId }
            : null
    }

    return source.userId ? { scope: "personal", scopeId: source.userId } : null
}

export function createDefaultRequestsListQueryParams(
    requestScope: RequestScopeKey
): RequestsQueryParams {
    return {
        ...requestScope,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        search: "",
        lifecycleStatus: FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT,
        closedReason: "",
        assignedTo: "",
        priority: "",
        fromDate: "",
        toDate: "",
    }
}

const REQUESTS_LIST_FILTER_SEARCH_PARAM_NAMES = [
    "search",
    "lifecycleStatus",
    "closedReason",
    "assignedTo",
    "priority",
    "fromDate",
    "toDate",
] as const

function isExplicitFirstPageParam(value: string | null): boolean {
    return value !== null && /^0*1$/.test(value)
}

function hasRequestsListFilterSearchParams(searchParams: URLSearchParams): boolean {
    return REQUESTS_LIST_FILTER_SEARCH_PARAM_NAMES.some((paramName) => searchParams.has(paramName))
}

function getSearchParamValue(searchParams: URLSearchParams, name: string): string | undefined {
    return searchParams.get(name) ?? undefined
}

export function createFirstRequestsListQueryParamsFromSearchParams(
    requestScope: RequestScopeKey,
    searchParams: URLSearchParams
): RequestsQueryParams | null {
    const parsers = compoundParsers.requestsPageState
    const pageParam = searchParams.get("page")
    const limitParam = getSearchParamValue(searchParams, "limit")
    const hasFilterSearchParams = hasRequestsListFilterSearchParams(searchParams)

    if (pageParam !== null && !isExplicitFirstPageParam(pageParam)) {
        return null
    }

    if (hasFilterSearchParams && !isExplicitFirstPageParam(pageParam)) {
        return null
    }

    const limit = parsers.limit.parseServerSide(limitParam)
    if (limit !== DEFAULT_PAGE_SIZE) {
        return null
    }

    const defaultParams = createDefaultRequestsListQueryParams(requestScope)
    const normalizedDateFilters = normalizeRequestDateFilterValues(
        parsers.fromDate.parseServerSide(getSearchParamValue(searchParams, "fromDate")),
        parsers.toDate.parseServerSide(getSearchParamValue(searchParams, "toDate"))
    )

    return {
        ...defaultParams,
        search: parsers.search.parseServerSide(getSearchParamValue(searchParams, "search")),
        lifecycleStatus: searchParams.has("lifecycleStatus")
            ? parsers.lifecycleStatus.parseServerSide(
                  getSearchParamValue(searchParams, "lifecycleStatus")
              )
            : defaultParams.lifecycleStatus,
        closedReason: parsers.closedReason.parseServerSide(
            getSearchParamValue(searchParams, "closedReason")
        ),
        assignedTo: parsers.assignedTo.parseServerSide(
            getSearchParamValue(searchParams, "assignedTo")
        ),
        priority: parsers.priority.parseServerSide(getSearchParamValue(searchParams, "priority")),
        fromDate: normalizedDateFilters.from,
        toDate: normalizedDateFilters.to,
    }
}

export const requestsKeys = {
    all: ["requests"] as const,
    scope: ({ scope, scopeId }: RequestScopeKey) => [...requestsKeys.all, scope, scopeId] as const,
    list: (params: RequestsQueryParams) =>
        [
            ...requestsKeys.scope(params),
            "list",
            params.page,
            params.limit,
            params.search,
            params.lifecycleStatus,
            params.closedReason,
            params.assignedTo,
            params.priority,
            params.fromDate,
            params.toDate,
        ] as const,
    byNumber: (requestScope: RequestScopeKey, requestNumber: string) =>
        [...requestsKeys.scope(requestScope), "byNumber", requestNumber] as const,
    categories: (organizationId: string | null | undefined) =>
        ["categories", organizationId ?? null] as const,
    services: (organizationId: string | null | undefined) =>
        ["services", organizationId ?? null] as const,
    invoicesByRequest: (requestId: string | undefined) =>
        ["invoices", "request", requestId] as const,
    quotesByRequest: (requestId: string | undefined) => ["quotes", "request", requestId] as const,
}

const getRequestsListResponseSchema = (scope: RequestsListScope) =>
    scope === "personal"
        ? personalRequestsListResponseSchema
        : organizationRequestsListResponseSchema

export function appendRequestScopeSearchParams(
    searchParams: URLSearchParams,
    requestScope: RequestScopeKey
) {
    searchParams.set("scope", requestScope.scope)
    searchParams.set("scopeId", requestScope.scopeId)
}

export function buildRequestByNumberEndpoint(
    requestNumber: string,
    requestScope: RequestScopeKey
): string {
    const urlParams = new URLSearchParams()
    appendRequestScopeSearchParams(urlParams, requestScope)

    return `/api/requests/by-number/${encodeURIComponent(requestNumber)}?${urlParams}`
}

export async function fetchRequestsPage(params: RequestsQueryParams): Promise<RequestsListData> {
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
    const urlParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })
    appendRequestScopeSearchParams(urlParams, params)

    if (search) urlParams.set("search", search)
    if (lifecycleStatus && lifecycleStatus !== "all" && lifecycleStatus !== "") {
        urlParams.set("lifecycleStatus", lifecycleStatus)
    }
    if (closedReason && closedReason !== "") urlParams.set("closedReason", closedReason)
    if (assignedTo && assignedTo !== "") urlParams.set("assignedTo", assignedTo)
    if (priority && priority !== "") urlParams.set("priority", priority)
    if (normalizedDateFilters.from) urlParams.set("fromDate", normalizedDateFilters.from)
    if (normalizedDateFilters.to) urlParams.set("toDate", normalizedDateFilters.to)

    const res = await fetch(`/api/requests?${urlParams}`, {
        credentials: "include",
    })

    const json = await parseJsonResponse(
        res,
        getRequestsListResponseSchema(params.scope),
        "Failed to fetch requests"
    )
    const { requests, pagination } = json.data

    return {
        requests,
        pagination: normalizeRequestsPagination(pagination, { page, limit }),
    }
}

export function requestsPageQueryOptions(params: RequestsQueryParams) {
    const normalizedDateFilters = normalizeRequestDateFilterValues(params.fromDate, params.toDate)
    const normalizedParams: RequestsQueryParams = {
        ...params,
        fromDate: normalizedDateFilters.from,
        toDate: normalizedDateFilters.to,
    }

    return queryOptions({
        queryKey: requestsKeys.list(normalizedParams),
        queryFn: () => fetchRequestsPage(normalizedParams),
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
    })
}

interface UseRequestsOptions {
    enabled?: boolean
    initialData?: RequestsListData
    initialDataUpdatedAt?: number
}

export function useRequests(params: RequestsQueryParams, options?: UseRequestsOptions) {
    const normalizedDateFilters = normalizeRequestDateFilterValues(params.fromDate, params.toDate)
    const normalizedParams: RequestsQueryParams = {
        ...params,
        fromDate: normalizedDateFilters.from,
        toDate: normalizedDateFilters.to,
    }

    return useQuery({
        ...requestsPageQueryOptions(normalizedParams),
        placeholderData: keepPreviousData,
        enabled: (options?.enabled ?? true) && !!normalizedParams.scopeId,
        refetchOnWindowFocus: false,
        ...(options?.initialData !== undefined
            ? {
                  initialData: options.initialData,
                  initialDataUpdatedAt: options.initialDataUpdatedAt,
              }
            : {}),
    })
}

interface UseRequestByNumberOptions {
    enabled?: boolean
}

export function useRequestByNumber(
    requestNumber: string,
    requestScope: RequestScopeKey,
    options?: UseRequestByNumberOptions
) {
    return useQuery({
        queryKey: requestsKeys.byNumber(requestScope, requestNumber),
        queryFn: async () => {
            const res = await fetch(buildRequestByNumberEndpoint(requestNumber, requestScope), {
                credentials: "include",
            })

            const json = await parseJsonResponse(
                res,
                requestDetailResponseSchema,
                "Failed to fetch request"
            )
            return json.data
        },
        staleTime: DEFAULT_STALE_TIME,
        enabled: (options?.enabled ?? true) && !!requestNumber && !!requestScope.scopeId,
    })
}
