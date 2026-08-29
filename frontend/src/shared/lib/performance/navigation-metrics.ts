import type { QueryKey } from "@tanstack/react-query"

const STORAGE_KEY = "ortelius:org-navigation-metrics"
const WINDOW_METRICS_KEY = "__ORTELIUS_ORG_NAVIGATION_METRICS__"
const DOM_METRICS_ATTRIBUTE = "data-org-route-metrics"

export type PrimaryDataSource = "network" | "prefetch" | "warm-cache" | "placeholder" | "unknown"

type NavigationMetricEventType =
    | "intent"
    | "transition-start"
    | "route-commit"
    | "transition-idle"
    | "primary-data-visible"
    | "prefetch-complete"

interface NavigationIntentInput {
    to: string
    from: string
    trigger: "click" | "focus" | "hover" | "programmatic"
    label?: string
}

interface RouteTransitionInput {
    to: string
    from: string
}

interface RouteCommitInput {
    pathname: string
}

interface PrimaryDataVisibleInput {
    routeId: string
    pathname: string
    dataSource: PrimaryDataSource
    queryKey?: QueryKey
    itemCount?: number
    detail?: Record<string, string | number | boolean | null>
}

interface PrefetchCompleteInput {
    routeId: string
    queryKey: QueryKey
}

interface QueryPrimaryDataSourceInput {
    queryKey?: QueryKey
    hasData: boolean
    isFetchedAfterMount: boolean
    isFetching?: boolean
    isPlaceholderData?: boolean
}

export interface NavigationMetricEvent {
    type: NavigationMetricEventType
    id: number
    at: number
    from?: string
    to?: string
    pathname?: string
    routeId?: string
    trigger?: NavigationIntentInput["trigger"]
    label?: string
    dataSource?: PrimaryDataSource
    queryKey?: string
    itemCount?: number
    detail?: Record<string, string | number | boolean | null>
    intentToVisibleMs?: number
    transitionToVisibleMs?: number
    commitToVisibleMs?: number
}

declare global {
    interface Window {
        __ORTELIUS_ORG_NAVIGATION_METRICS__?: NavigationMetricEvent[]
    }
}

interface ActiveNavigation {
    id: number
    from: string
    to: string
    intentAt?: number
    transitionStartAt?: number
    committedAt?: number
}

let nextNavigationId = 1
let latestIntent: (NavigationMetricEvent & { to: string; at: number }) | null = null
let activeNavigation: ActiveNavigation | null = null
const prefetchedQueryKeys = new Set<string>()

export function recordNavigationIntent(input: NavigationIntentInput): void {
    const event = createEvent({
        type: "intent",
        id: nextNavigationId++,
        from: input.from,
        to: input.to,
        trigger: input.trigger,
        label: input.label,
    })

    latestIntent = { ...event, to: input.to, at: event.at }
    activeNavigation = {
        id: event.id,
        from: input.from,
        to: input.to,
        intentAt: event.at,
    }
    publishNavigationMetric(event)
}

export function recordRouteTransitionStart(input: RouteTransitionInput): void {
    const nowMs = getNow()
    const matchingIntent = latestIntent && latestIntent.to === input.to ? latestIntent : null
    const id = matchingIntent?.id ?? nextNavigationId++

    activeNavigation = {
        id,
        from: input.from,
        to: input.to,
        intentAt: matchingIntent?.at,
        transitionStartAt: nowMs,
    }

    publishNavigationMetric({
        type: "transition-start",
        id,
        at: nowMs,
        from: input.from,
        to: input.to,
    })
}

export function recordRouteCommitted(input: RouteCommitInput): void {
    const nowMs = getNow()
    const id = activeNavigation?.id ?? nextNavigationId++

    if (activeNavigation) {
        activeNavigation.committedAt = nowMs
    }

    publishNavigationMetric({
        type: "route-commit",
        id,
        at: nowMs,
        pathname: input.pathname,
    })
}

export function recordRouteTransitionIdle(input: RouteCommitInput): void {
    publishNavigationMetric(
        createEvent({
            type: "transition-idle",
            id: activeNavigation?.id ?? nextNavigationId++,
            pathname: input.pathname,
        })
    )
}

export function recordPrimaryDataVisible(input: PrimaryDataVisibleInput): void {
    const nowMs = getNow()
    const event: NavigationMetricEvent = {
        type: "primary-data-visible",
        id: activeNavigation?.id ?? nextNavigationId++,
        at: nowMs,
        pathname: input.pathname,
        routeId: input.routeId,
        dataSource: input.dataSource,
        queryKey: input.queryKey ? serializeQueryKey(input.queryKey) : undefined,
        itemCount: input.itemCount,
        detail: input.detail,
        intentToVisibleMs: activeNavigation?.intentAt
            ? roundDuration(nowMs - activeNavigation.intentAt)
            : undefined,
        transitionToVisibleMs: activeNavigation?.transitionStartAt
            ? roundDuration(nowMs - activeNavigation.transitionStartAt)
            : undefined,
        commitToVisibleMs: activeNavigation?.committedAt
            ? roundDuration(nowMs - activeNavigation.committedAt)
            : undefined,
    }

    publishNavigationMetric(event)
}

export function recordQueryPrefetchComplete(input: PrefetchCompleteInput): void {
    const serializedQueryKey = serializeQueryKey(input.queryKey)
    prefetchedQueryKeys.add(serializedQueryKey)
    publishNavigationMetric(
        createEvent({
            type: "prefetch-complete",
            id: activeNavigation?.id ?? nextNavigationId++,
            routeId: input.routeId,
            queryKey: serializedQueryKey,
        })
    )
}

export function getQueryPrimaryDataSource(input: QueryPrimaryDataSourceInput): PrimaryDataSource {
    if (!input.hasData) return input.isFetchedAfterMount ? "network" : "unknown"
    if (input.isPlaceholderData) return "placeholder"

    const queryKey = input.queryKey ? serializeQueryKey(input.queryKey) : null
    if (queryKey && prefetchedQueryKeys.has(queryKey)) return "prefetch"

    if (input.isFetchedAfterMount) return "network"
    if (input.isFetching) return "warm-cache"
    return "warm-cache"
}

function createEvent(event: Omit<NavigationMetricEvent, "at">): NavigationMetricEvent {
    return {
        ...event,
        at: getNow(),
    }
}

function publishNavigationMetric(event: NavigationMetricEvent): void {
    if (typeof window !== "undefined") {
        const events = window[WINDOW_METRICS_KEY] ?? []
        events.push(event)
        window[WINDOW_METRICS_KEY] = events
        exposeNavigationMetricsForLocalDebugging(events)
    }

    if (!isNavigationMetricLoggingEnabled()) return

    console.info("[org-route-metrics]", event)
    console.info("[org-route-metrics-json]", JSON.stringify(event))
}

function isNavigationMetricLoggingEnabled(): boolean {
    if (typeof window === "undefined") return false
    if (import.meta.env.DEV) return true

    try {
        return window.localStorage.getItem(STORAGE_KEY) === "1"
    } catch {
        return false
    }
}

function exposeNavigationMetricsForLocalDebugging(events: NavigationMetricEvent[]): void {
    if (typeof document === "undefined" || typeof window === "undefined") return
    if (!isLocalMetricDebuggingEnabled()) return

    try {
        document.documentElement.setAttribute(
            DOM_METRICS_ATTRIBUTE,
            JSON.stringify(events.slice(-200))
        )
    } catch {
        // Debug-only metric exposure should never affect navigation.
    }
}

function isLocalMetricDebuggingEnabled(): boolean {
    if (import.meta.env.DEV) return true

    const hostname = window.location.hostname
    if (hostname === "localhost" || hostname === "127.0.0.1") return true

    try {
        return window.localStorage.getItem(STORAGE_KEY) === "1"
    } catch {
        return false
    }
}

function getNow(): number {
    if (typeof performance === "undefined") return Date.now()
    return performance.now()
}

function roundDuration(value: number): number {
    return Math.round(value * 10) / 10
}

function serializeQueryKey(queryKey: QueryKey): string {
    return JSON.stringify(queryKey)
}
