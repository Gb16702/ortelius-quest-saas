import { createContext, type ReactNode, use, useCallback, useEffect, useMemo } from "react"
import type { DateRange } from "react-day-picker"
import { useTranslation } from "react-i18next"
import { useFavorites, useFavoriteToggle } from "@/entities/favorite"
import { getRequestStatusDisplay } from "@/entities/request"
import type { SessionResponse } from "@/entities/session"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { ValidationError } from "@/shared/lib/validation/valibot-parse"
import { showRetryErrorToast } from "@/shared/ui/toasts"
import {
    createRequestScopeKey,
    type RequestScopeKey,
    type RequestsListScope,
    type RequestsQueryParams,
    requestsKeys,
    useRequests,
} from "../api/requests.api"
import type { AssignDialogMember } from "../lib/request-assignment"
import { createRequestOptimisticFavorite } from "../lib/request-favorite"
import {
    createRequestDateRange,
    parseRequestFilterValues,
    parseRequestStatusFilter,
    toRequestDateFilterValues,
    toRequestStatusFilterValue,
} from "../lib/request-filters"
import { useRequestColumns } from "../ui/request-columns"
import { useRequestActions } from "./hooks/use-request-actions"
import { useRequestAssignmentDialog } from "./hooks/use-request-assignment-dialog"
import { useRequestSheet } from "./hooks/use-request-sheet"
import { useRequestsExport } from "./hooks/use-requests-export"
import { useRequestsSearch } from "./hooks/use-requests-search"
import type { UserRequest } from "./request"

const STATUS_OPTION_VALUES = ["invoiced", "quoted", "open", "closed", "draft"] as const

interface RequestsPageState {
    requests: UserRequest[]
    columns: unknown[]
    isLoading: boolean
    hasRequestsError: boolean
    requestsErrorMessage: string | null
    isPlaceholderData: boolean
    isFetching: boolean
    pagination: {
        total: number
        page: number
        currentPage: number
        limit: number
        totalPages: number
    }
    searchQuery: string
    selectedStatuses: string[]
    selectedAssignees: string[]
    selectedPriorities: string[]
    dateRange: DateRange | undefined
    statusOptions: { value: string; label: string; color: string }[]
    hasActiveFilters: boolean
    isOrganizationView: boolean
    organizationId: string
    currentUserId: string
    isExporting: boolean
    isAssignDialogOpen: boolean
    selectedRequestForAssignment: UserRequest | null
    assignDialogMembers: AssignDialogMember[]
    isLoadingMembers: boolean
    isAssigning: boolean
    basePath: string
}

interface RequestsPageActions {
    updateSearch: (search: string) => void
    updateStatusFilter: (statuses: string[]) => void
    updateAssignedToFilter: (assignees: string[]) => void
    updatePriorityFilter: (priorities: string[]) => void
    changeDateRange: (range: DateRange | undefined) => void
    updatePage: (page: number) => void
    updatePageSize: (size: number) => void
    clearFilters: () => void
    retryRequests: () => void
    openRequest: (reqNumber: string) => void
    openAssignDialog: (request: UserRequest) => void
    closeAssignDialog: () => void
    assignMember: (memberId: string) => Promise<void>
    unassignMember: () => Promise<void>
    exportRequests: () => Promise<void>
    onRowClick: (request: UserRequest) => void
}

interface RequestsPageMeta {
    requestScope: RequestScopeKey
    organizationId: string
    currentUserId: string
    isOrganizationView: boolean
    basePath: string
}

interface RequestsPageContextValue {
    state: RequestsPageState
    actions: RequestsPageActions
    meta: RequestsPageMeta
}

const RequestsPageContext = createContext<RequestsPageContextValue | null>(null)

export function useRequestsPage(): RequestsPageContextValue {
    const ctx = use(RequestsPageContext)
    if (!ctx) {
        throw new Error("useRequestsPage must be used within RequestsPageProvider")
    }
    return ctx
}

interface RequestsPageProviderProps {
    sessionData: SessionResponse | null
    scope: RequestsListScope
    basePath: string
    currentUserRole?: string | null
    onNavigate?: (href: string) => void
    onShareRequest?: (request: UserRequest) => void
    children: ReactNode
}

interface ResolvedRequestsListScope {
    requestScope: RequestScopeKey
    organizationId: string
    currentUserId: string
    isOrganizationView: boolean
}

interface MissingRequestsListScope {
    status: "missing-user" | "missing-organization"
}

type RequestsListScopeState =
    | ({ status: "ready" } & ResolvedRequestsListScope)
    | MissingRequestsListScope

function createRequestsListScopeState(
    scope: RequestsListScope,
    sessionData: SessionResponse | null
): RequestsListScopeState {
    const currentUserId = sessionData?.user?.id

    if (!currentUserId) {
        return { status: "missing-user" }
    }

    if (scope === "personal") {
        return {
            status: "ready",
            requestScope: { scope: "personal", scopeId: currentUserId },
            organizationId: "",
            currentUserId,
            isOrganizationView: false,
        }
    }

    const organizationId = sessionData?.session?.activeOrganizationId
    const requestScope = createRequestScopeKey({ scope: "organization", organizationId })

    if (!requestScope) {
        return { status: "missing-organization" }
    }

    return {
        status: "ready",
        requestScope,
        organizationId: requestScope.scopeId,
        currentUserId,
        isOrganizationView: true,
    }
}

function throwRequestsListScopeError(scopeState: MissingRequestsListScope): never {
    if (scopeState.status === "missing-user") {
        throw new Response("Authentication required to list requests", { status: 401 })
    }

    throw new Response("Organization request scope is missing", { status: 404 })
}

function getRequestsQueryErrorMessageKey(error: unknown): string | null {
    if (!error) return null

    if (error instanceof ValidationError) {
        return "requests:error.responseShape"
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message
    }

    return "requests:error.loadFailed"
}

export function RequestsPageProvider({
    sessionData,
    scope,
    basePath,
    currentUserRole = null,
    onNavigate,
    onShareRequest,
    children,
}: RequestsPageProviderProps) {
    const scopeState = createRequestsListScopeState(scope, sessionData)

    if (scopeState.status !== "ready") {
        throwRequestsListScopeError(scopeState)
    }

    return (
        <ResolvedRequestsPageProvider
            sessionData={sessionData}
            scopeState={scopeState}
            basePath={basePath}
            currentUserRole={currentUserRole}
            onNavigate={onNavigate}
            onShareRequest={onShareRequest}
        >
            {children}
        </ResolvedRequestsPageProvider>
    )
}

interface ResolvedRequestsPageProviderProps {
    sessionData: SessionResponse | null
    scopeState: ResolvedRequestsListScope
    basePath: string
    currentUserRole: string | null
    onNavigate?: (href: string) => void
    onShareRequest?: (request: UserRequest) => void
    children: ReactNode
}

function ResolvedRequestsPageProvider({
    sessionData,
    scopeState,
    basePath,
    currentUserRole,
    onNavigate,
    onShareRequest,
    children,
}: ResolvedRequestsPageProviderProps) {
    const { t } = useTranslation("requests")
    const statusOptions = useMemo(
        () =>
            STATUS_OPTION_VALUES.map((status) => ({
                value: status,
                color: getRequestStatusDisplay(status).colorClassName,
                label: t(getRequestStatusDisplay(status).labelKey, {
                    defaultValue: getRequestStatusDisplay(status).fallbackLabel,
                }),
            })),
        [t]
    )
    const { openRequest } = useRequestSheet()

    const {
        search: searchQuery,
        lifecycleStatus: statusFilter,
        closedReason: closedReasonFilter,
        assignedTo: assignedToFilter,
        priority: priorityFilter,
        fromDate,
        toDate,
        page,
        limit,
        isLoading: isSearchLoading,
        hasActiveFilters,
        updateSearch,
        updateStatus,
        updateAssignedTo,
        updatePriority,
        updateDateRange,
        updatePage,
        updatePageSize,
        clearFilters,
    } = useRequestsSearch()

    const activeSearch = searchQuery || ""
    const { organizationId, isOrganizationView, currentUserId, requestScope } = scopeState

    const requestsQueryParams = useMemo<RequestsQueryParams>(
        () => ({
            ...requestScope,
            page,
            limit,
            search: activeSearch,
            lifecycleStatus: statusFilter || "",
            closedReason: closedReasonFilter || "",
            assignedTo: assignedToFilter || "",
            priority: priorityFilter || "",
            fromDate: fromDate || "",
            toDate: toDate || "",
        }),
        [
            requestScope,
            page,
            limit,
            activeSearch,
            statusFilter,
            closedReasonFilter,
            assignedToFilter,
            priorityFilter,
            fromDate,
            toDate,
        ]
    )
    const requestsQueryKey = useMemo(
        () => requestsKeys.list(requestsQueryParams),
        [requestsQueryParams]
    )
    const requestsQuery = useRequests(requestsQueryParams)
    const hasRequestsError = requestsQuery.isError
    const requestsErrorMessage = useMemo(() => {
        const key = getRequestsQueryErrorMessageKey(requestsQuery.error)
        if (!key) return null
        return t(key, { defaultValue: key })
    }, [requestsQuery.error, t])

    const requests = hasRequestsError ? [] : requestsQuery.data?.requests || []
    const rawPagination =
        !hasRequestsError && requestsQuery.data?.pagination
            ? requestsQuery.data.pagination
            : {
                  total: 0,
                  page: 1,
                  limit: 10,
                  totalPages: 0,
              }

    const pagination = useMemo(
        () => ({
            total: rawPagination.total,
            page: rawPagination.page,
            currentPage: rawPagination.page,
            limit: rawPagination.limit,
            totalPages: rawPagination.totalPages,
        }),
        [rawPagination.total, rawPagination.page, rawPagination.limit, rawPagination.totalPages]
    )

    const isLoading = isSearchLoading || requestsQuery.isLoading
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey: requestsQueryKey,
        hasData: Boolean(requestsQuery.data),
        isFetchedAfterMount: requestsQuery.isFetchedAfterMount,
        isFetching: requestsQuery.isFetching,
        isPlaceholderData: requestsQuery.isPlaceholderData,
    })

    usePrimaryDataVisibleMetric({
        routeId: isOrganizationView ? "org.requests" : "me.requests",
        isVisible: !isLoading && Boolean(requestsQuery.data),
        dataSource: primaryDataSource,
        queryKey: requestsQueryKey,
        itemCount: requests.length,
        detail: {
            page,
            limit,
            scope: requestScope.scope,
        },
    })

    const requestActions = useRequestActions()
    const favoritesQuery = useFavorites(isOrganizationView ? organizationId : undefined)
    const { mutate: toggleFavorite } = useFavoriteToggle()
    const favoriteRequestIds = useMemo(
        () =>
            new Set(
                (favoritesQuery.data?.favorites ?? [])
                    .filter((favorite) => favorite.entityType === "request")
                    .map((favorite) => favorite.entityId)
            ),
        [favoritesQuery.data?.favorites]
    )

    const toggleRequestFavorite = useCallback(
        (request: UserRequest) => {
            if (!isOrganizationView) return

            toggleFavorite({
                entityType: "request",
                entityId: request.id,
                isFavorited: favoriteRequestIds.has(request.id),
                organizationId,
                optimisticFavorite: createRequestOptimisticFavorite(request, organizationId),
            })
        },
        [favoriteRequestIds, isOrganizationView, organizationId, toggleFavorite]
    )

    useEffect(() => {
        if (!requestsQuery.isError) return
        showRetryErrorToast(t("toast.failedToLoadRequests"), {
            onRetry: () => requestsQuery.refetch(),
        })
    }, [requestsQuery.isError, requestsQuery.refetch, t])

    const retryRequests = useCallback(() => {
        void requestsQuery.refetch()
    }, [requestsQuery.refetch])

    const selectedStatuses = useMemo(() => parseRequestStatusFilter(statusFilter), [statusFilter])

    const selectedAssignees = useMemo(
        () => parseRequestFilterValues(assignedToFilter),
        [assignedToFilter]
    )

    const selectedPriorities = useMemo(
        () => parseRequestFilterValues(priorityFilter),
        [priorityFilter]
    )

    const dateRange = useMemo(
        (): DateRange | undefined => createRequestDateRange(fromDate, toDate),
        [fromDate, toDate]
    )

    const updateStatusFilter = useCallback(
        (values: string[]) => {
            updateStatus(toRequestStatusFilterValue(values))
        },
        [updateStatus]
    )

    const updatePriorityFilter = useCallback(
        (values: string[]) => {
            updatePriority(values)
        },
        [updatePriority]
    )

    const changeDateRange = useCallback(
        (newDateRange: DateRange | undefined) => {
            const { from, to } = toRequestDateFilterValues(newDateRange)
            updateDateRange(from, to)
        },
        [updateDateRange]
    )

    const {
        state: {
            isOpen: isAssignDialogOpen,
            selectedRequest: selectedRequestForAssignment,
            members: assignDialogMembers,
            isLoadingMembers,
            isAssigning,
        },
        actions: { openAssignDialog, closeAssignDialog, assignMember, unassignMember },
    } = useRequestAssignmentDialog({
        organizationId,
        requestScope,
        currentUserId,
        currentUserRole,
    })

    const { isExporting, exportRequests } = useRequestsExport({
        totalRequests: pagination.total,
        statusFilter,
        assignedToFilter,
        priorityFilter,
        search: activeSearch,
        fromDate,
        toDate,
        isOrganizationView,
        requestScope,
    })

    const columns = useRequestColumns({
        sessionData,
        onViewRequest: openRequest,
        onDownloadPdf: requestActions.downloadPdf,
        onShareRequest,
        favoriteRequestIds,
        onToggleFavoriteRequest: isOrganizationView ? toggleRequestFavorite : undefined,
        onExport: exportRequests,
        onAssignRequest: openAssignDialog,
        currentUserRole,
        canExport: true,
        isExporting,
        requestsCount: requests.length,
        basePath,
        onNavigate,
    })

    const onRowClick = useCallback(
        (request: UserRequest) => openRequest(request.reqNumber),
        [openRequest]
    )

    const value = useMemo(
        (): RequestsPageContextValue => ({
            state: {
                requests,
                columns,
                isLoading,
                hasRequestsError,
                requestsErrorMessage,
                isPlaceholderData: requestsQuery.isPlaceholderData,
                isFetching: requestsQuery.isFetching,
                pagination,
                searchQuery: searchQuery || "",
                selectedStatuses,
                selectedAssignees,
                selectedPriorities,
                dateRange,
                statusOptions,
                hasActiveFilters,
                isOrganizationView,
                organizationId,
                currentUserId,
                isExporting,
                isAssignDialogOpen,
                selectedRequestForAssignment,
                assignDialogMembers,
                isLoadingMembers,
                isAssigning,
                basePath,
            },
            actions: {
                updateSearch,
                updateStatusFilter,
                updateAssignedToFilter: updateAssignedTo,
                updatePriorityFilter,
                changeDateRange,
                updatePage,
                updatePageSize,
                clearFilters,
                retryRequests,
                openRequest,
                openAssignDialog,
                closeAssignDialog,
                assignMember,
                unassignMember,
                exportRequests,
                onRowClick,
            },
            meta: {
                requestScope,
                organizationId,
                currentUserId,
                isOrganizationView,
                basePath,
            },
        }),
        [
            requests,
            columns,
            isLoading,
            hasRequestsError,
            requestsErrorMessage,
            requestsQuery.isPlaceholderData,
            requestsQuery.isFetching,
            pagination,
            searchQuery,
            selectedStatuses,
            selectedAssignees,
            selectedPriorities,
            dateRange,
            statusOptions,
            hasActiveFilters,
            isOrganizationView,
            organizationId,
            currentUserId,
            isExporting,
            isAssignDialogOpen,
            selectedRequestForAssignment,
            assignDialogMembers,
            isLoadingMembers,
            isAssigning,
            basePath,
            updateSearch,
            updateStatusFilter,
            updateAssignedTo,
            updatePriorityFilter,
            changeDateRange,
            updatePage,
            updatePageSize,
            clearFilters,
            retryRequests,
            openRequest,
            openAssignDialog,
            closeAssignDialog,
            assignMember,
            unassignMember,
            exportRequests,
            onRowClick,
            requestScope,
        ]
    )

    return <RequestsPageContext value={value}>{children}</RequestsPageContext>
}
