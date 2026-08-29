import { type QueryClient, type QueryKey, useQueryClient } from "@tanstack/react-query"
import { useLocation } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { activityEventsInfiniteQueryOptions } from "@/entities/activity"
import { invitationsPageQueryOptions } from "@/entities/invitation"
import { membersPageQueryOptions } from "@/entities/member"
import { organizationInfoQueryOptions, useOrg } from "@/entities/organization"
import {
    organizationCategoriesQueryOptions,
    organizationServicesQueryOptions,
} from "@/entities/organization-business-catalog"
import type { SessionResponse } from "@/entities/session"
import { conversationsFeedInfiniteQueryOptions } from "@/features/chat"
import { memberMetricsQueryOptions, organizationMetricsQueryOptions } from "@/features/dashboard"
import {
    createDefaultRequestsListQueryParams,
    createRequestScopeKey,
    requestsPageQueryOptions,
} from "@/features/requests"
import { recordQueryPrefetchComplete } from "@/shared/lib/performance/navigation-metrics"
import { DEFAULT_PAGE_SIZE } from "@/shared/lib/url.state"

const DEFAULT_PREFETCH_THROTTLE_MS = 2_000
const DEFAULT_ROUTE_WARM_CACHE_IDLE_TIMEOUT_MS = 2_500
const DEFAULT_DASHBOARD_PERIOD = 30
const DEFAULT_ORG_LIST_STALE_MS = 5 * 60 * 1000
const DEFAULT_DASHBOARD_STALE_MS = 5 * 60 * 1000
const DEFAULT_SHORT_STALE_MS = 30_000
const DEFAULT_CHAT_STALE_MS = 60_000

interface UseOrgRouteDataPrefetchOptions {
    sessionData: SessionResponse | null
}

type OrgRoutePrefetchTarget =
    | "dashboard-contributions"
    | "dashboard-organization"
    | "requests"
    | "chats"
    | "team-members"
    | "team-invitations"
    | "team-activity"
    | "settings-business"
    | "settings"
    | "unsupported"

type OrgRoutePrefetchSource = "intent" | "warm-cache"

interface OrgRoutePrefetchContext {
    queryClient: QueryClient
    organizationId: string
    userId: string
    slug: string
    basePath: string
    isAdmin: boolean
    source: OrgRoutePrefetchSource
}

type OrgRoutePrefetchBaseContext = Omit<OrgRoutePrefetchContext, "source">

interface OrgRouteWarmCacheTargetInput {
    pathname: string
    slug: string
    isAdmin: boolean
}

type OrgRoutePrefetcher = (context: OrgRoutePrefetchContext) => void

const ORG_ROUTE_PREFETCHERS: Partial<Record<OrgRoutePrefetchTarget, OrgRoutePrefetcher>> = {
    requests: prefetchRequestsRoute,
    "team-members": prefetchTeamRouteGroup,
    "team-invitations": prefetchTeamInvitationsRoute,
    chats: prefetchChatsRoute,
    "dashboard-contributions": prefetchDashboardContributionsRoute,
    "dashboard-organization": prefetchDashboardOrganizationRoute,
    "team-activity": prefetchTeamActivityRoute,
    "settings-business": prefetchSettingsBusinessRoute,
    settings: prefetchSettingsRoute,
}

export function useOrgRouteDataPrefetch({ sessionData }: UseOrgRouteDataPrefetchOptions) {
    const queryClient = useQueryClient()
    const pathname = useLocation({ select: (location) => location.pathname })
    const { state, meta } = useOrg()
    const lastPrefetchAtByUrlRef = useRef<Map<string, number>>(new Map())
    const warmCacheKeysRef = useRef<Set<string>>(new Set())
    const organizationId = sessionData?.session?.activeOrganizationId ?? state.org.id
    const userId = sessionData?.user?.id ?? ""
    const slug = meta.slug
    const basePath = `/org/${slug}`
    const isAdmin = state.isAdmin

    const prefetchContext = useMemo<OrgRoutePrefetchBaseContext | null>(() => {
        if (!organizationId || !userId) return null

        return { queryClient, organizationId, userId, slug, basePath, isAdmin }
    }, [basePath, isAdmin, organizationId, queryClient, slug, userId])

    const prefetchTargetData = useCallback(
        (target: OrgRoutePrefetchTarget) => {
            if (!prefetchContext) return

            const prefetcher = ORG_ROUTE_PREFETCHERS[target]
            prefetcher?.({ ...prefetchContext, source: "intent" })
        },
        [prefetchContext]
    )

    const prefetchRouteData = useCallback(
        (to: string) => {
            if (!prefetchContext) return

            const now = Date.now()
            const lastPrefetchAt = lastPrefetchAtByUrlRef.current.get(to) ?? 0
            if (now - lastPrefetchAt < DEFAULT_PREFETCH_THROTTLE_MS) return
            lastPrefetchAtByUrlRef.current.set(to, now)

            const target = getOrgRoutePrefetchTarget(to, slug)
            prefetchTargetData(target)
        },
        [prefetchContext, prefetchTargetData, slug]
    )

    useEffect(() => {
        if (!prefetchContext) return
        if (shouldSkipAutomaticWarmCache()) return

        const targets = getOrgRouteWarmCacheTargets({
            pathname,
            slug: prefetchContext.slug,
            isAdmin: prefetchContext.isAdmin,
        })
        if (targets.length === 0) return

        const warmCacheKey = [
            prefetchContext.organizationId,
            prefetchContext.userId,
            prefetchContext.slug,
            prefetchContext.isAdmin ? "admin" : "member",
            pathname,
        ].join(":")

        if (warmCacheKeysRef.current.has(warmCacheKey)) return

        const cancelWarmCache = scheduleOrgRouteWarmCache(() => {
            if (warmCacheKeysRef.current.has(warmCacheKey)) return
            warmCacheKeysRef.current.add(warmCacheKey)
            prefetchWarmCacheTargets({ ...prefetchContext, source: "warm-cache" }, targets)
        })

        return cancelWarmCache
    }, [pathname, prefetchContext])

    return { prefetchRouteData }
}

export function getOrgRouteWarmCacheTargets({
    pathname,
    slug,
    isAdmin,
}: OrgRouteWarmCacheTargetInput): OrgRoutePrefetchTarget[] {
    const basePath = `/org/${slug}`

    if (pathname === `${basePath}/dashboard`) {
        return ["dashboard-contributions", "requests"]
    }

    if (pathname === `${basePath}/requests`) return ["requests"]
    if (pathname === `${basePath}/chats`) return ["chats"]
    if (pathname === `${basePath}/team` || pathname === `${basePath}/team/members`) {
        return ["team-members"]
    }
    if (pathname === `${basePath}/team/invitations`) return isAdmin ? ["team-invitations"] : []
    if (pathname === `${basePath}/team/activity`) return isAdmin ? ["team-activity"] : []
    if (pathname === `${basePath}/settings/business`) return isAdmin ? ["settings-business"] : []

    return []
}

function prefetchWarmCacheTargets(
    context: OrgRoutePrefetchContext,
    targets: OrgRoutePrefetchTarget[]
): void {
    for (const target of targets) {
        const prefetcher = ORG_ROUTE_PREFETCHERS[target]
        prefetcher?.(context)
    }
}

function scheduleOrgRouteWarmCache(callback: () => void): () => void {
    if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
        const idleCallbackId = window.requestIdleCallback(callback, {
            timeout: DEFAULT_ROUTE_WARM_CACHE_IDLE_TIMEOUT_MS,
        })

        return () => window.cancelIdleCallback(idleCallbackId)
    }

    const timeoutId = globalThis.setTimeout(callback, DEFAULT_ROUTE_WARM_CACHE_IDLE_TIMEOUT_MS)
    return () => globalThis.clearTimeout(timeoutId)
}

export function shouldSkipAutomaticWarmCache(): boolean {
    if (typeof window === "undefined") return true

    return shouldSkipAutomaticWarmCacheForConnection(getNavigatorConnection(window.navigator))
}

export function shouldSkipAutomaticWarmCacheForConnection(
    connection: NavigatorConnectionLike | null
): boolean {
    if (!connection) return false
    if (connection.saveData === true) return true

    return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g"
}

function prefetchRequestsRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, organizationId } = context
    const requestScope = createRequestScopeKey({
        scope: "organization",
        organizationId,
    })
    if (!requestScope) return

    const options = requestsPageQueryOptions(createDefaultRequestsListQueryParams(requestScope))
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_ORG_LIST_STALE_MS,
        routeId: "org.requests",
        source: context.source,
        prefetch: () => queryClient.prefetchQuery(options),
    })
}

function prefetchTeamMembersRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, organizationId } = context
    const options = membersPageQueryOptions(organizationId, {
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        search: "",
        role: "",
    })
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_ORG_LIST_STALE_MS,
        routeId: "org.team.members",
        source: context.source,
        prefetch: () => queryClient.prefetchQuery(options),
    })
}

function prefetchTeamRouteGroup(context: OrgRoutePrefetchContext): void {
    prefetchTeamMembersRoute(context)

    if (!context.isAdmin) return

    prefetchTeamInvitationsRoute(context)
    prefetchTeamActivityRoute(context)
}

function prefetchTeamInvitationsRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, organizationId, isAdmin } = context
    if (!isAdmin) return

    const options = invitationsPageQueryOptions(organizationId, {
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        search: "",
        role: "",
        status: "",
    })
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_ORG_LIST_STALE_MS,
        routeId: "org.team.invitations",
        source: context.source,
        prefetch: () => queryClient.prefetchQuery(options),
    })
}

function prefetchChatsRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, userId, basePath } = context
    const options = conversationsFeedInfiniteQueryOptions({
        userId,
        scope: basePath,
        filter: "all",
        typeFilter: "all",
        sort: "newest",
        searchQuery: "",
    })
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_CHAT_STALE_MS,
        routeId: "org.chats",
        source: context.source,
        prefetch: () => queryClient.prefetchInfiniteQuery(options),
    })
}

function prefetchDashboardContributionsRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, userId, slug } = context
    const options = memberMetricsQueryOptions(userId, slug, DEFAULT_DASHBOARD_PERIOD)
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_DASHBOARD_STALE_MS,
        routeId: "org.dashboard.contributions",
        source: context.source,
        prefetch: () => queryClient.prefetchQuery(options),
    })

    if (context.isAdmin) {
        prefetchDashboardOrganizationRoute(context)
    }
}

function prefetchDashboardOrganizationRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, slug, isAdmin } = context
    if (!isAdmin) return

    const options = organizationMetricsQueryOptions(slug, DEFAULT_DASHBOARD_PERIOD)
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_DASHBOARD_STALE_MS,
        routeId: "org.dashboard.organization",
        source: context.source,
        prefetch: () => queryClient.prefetchQuery(options),
    })
}

function prefetchTeamActivityRoute(context: OrgRoutePrefetchContext): void {
    const { queryClient, organizationId, slug, isAdmin } = context
    if (!isAdmin) return

    const options = activityEventsInfiniteQueryOptions({
        organizationId,
        organizationSlug: slug,
        actorId: null,
        datePreset: "all",
        eventTypes: null,
    })
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_SHORT_STALE_MS,
        routeId: "org.team.activity",
        source: context.source,
        prefetch: () => queryClient.prefetchInfiniteQuery(options),
    })
}

function prefetchSettingsRoute({
    queryClient,
    organizationId,
    isAdmin,
    source,
}: OrgRoutePrefetchContext): void {
    if (!isAdmin) return

    const options = organizationInfoQueryOptions(organizationId)
    recordPrefetchIfStale({
        queryClient,
        queryKey: options.queryKey,
        staleTimeMs: DEFAULT_SHORT_STALE_MS,
        routeId: "org.settings",
        source,
        prefetch: () => queryClient.prefetchQuery(options),
    })
}

function prefetchSettingsBusinessRoute(context: OrgRoutePrefetchContext): void {
    prefetchSettingsRoute(context)

    if (!context.isAdmin) return

    const categoriesOptions = organizationCategoriesQueryOptions(context.organizationId)
    const servicesOptions = organizationServicesQueryOptions(context.organizationId)

    recordPrefetchIfStale({
        queryClient: context.queryClient,
        queryKey: categoriesOptions.queryKey,
        staleTimeMs: DEFAULT_SHORT_STALE_MS,
        routeId: "org.settings.business.categories",
        source: context.source,
        prefetch: () => context.queryClient.prefetchQuery(categoriesOptions),
    })
    recordPrefetchIfStale({
        queryClient: context.queryClient,
        queryKey: servicesOptions.queryKey,
        staleTimeMs: DEFAULT_SHORT_STALE_MS,
        routeId: "org.settings.business.services",
        source: context.source,
        prefetch: () => context.queryClient.prefetchQuery(servicesOptions),
    })
}

interface RecordPrefetchIfStaleInput {
    queryClient: QueryClient
    queryKey: QueryKey
    staleTimeMs: number
    routeId: string
    source: OrgRoutePrefetchSource
    prefetch: () => Promise<unknown>
}

function recordPrefetchIfStale({
    queryClient,
    queryKey,
    staleTimeMs,
    routeId,
    source,
    prefetch,
}: RecordPrefetchIfStaleInput): void {
    const now = Date.now()
    if (hasFreshPrefetchData(queryClient, queryKey, staleTimeMs, now)) return
    if (queryClient.isFetching({ queryKey }) > 0) return

    recordPrefetch(prefetch(), getPrefetchMetricRouteId(routeId, source), queryKey)
}

export function hasFreshPrefetchData(
    queryClient: QueryClient,
    queryKey: QueryKey,
    staleTimeMs: number,
    now: number
): boolean {
    const state = queryClient.getQueryState(queryKey)
    if (!state || state.status !== "success" || state.isInvalidated) return false

    return now - state.dataUpdatedAt < staleTimeMs
}

function recordPrefetch(promise: Promise<unknown>, routeId: string, queryKey: QueryKey): void {
    void promise
        .then(() => {
            recordQueryPrefetchComplete({
                routeId,
                queryKey,
            })
        })
        .catch(() => {
            // Prefetch failures should stay silent until the destination route needs the data.
        })
}

function getPrefetchMetricRouteId(routeId: string, source: OrgRoutePrefetchSource): string {
    return `${routeId}.${source}`
}

export interface NavigatorConnectionLike {
    effectiveType?: string
    saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
    connection?: NavigatorConnectionLike
}

function getNavigatorConnection(navigator: Navigator): NavigatorConnectionLike | null {
    return (navigator as NavigatorWithConnection).connection ?? null
}

export function getOrgRoutePrefetchTarget(to: string, slug: string): OrgRoutePrefetchTarget {
    const pathname = to.split("?")[0] ?? to
    const basePath = `/org/${slug}`

    if (pathname === `${basePath}/dashboard`) return "dashboard-contributions"
    if (pathname === `${basePath}/requests`) return "requests"
    if (pathname === `${basePath}/chats`) return "chats"
    if (pathname === `${basePath}/team` || pathname === `${basePath}/team/members`) {
        return "team-members"
    }
    if (pathname === `${basePath}/team/invitations`) return "team-invitations"
    if (pathname === `${basePath}/team/activity`) return "team-activity"
    if (pathname === `${basePath}/settings/business`) return "settings-business"
    if (pathname.startsWith(`${basePath}/settings`)) return "settings"

    return "unsupported"
}
