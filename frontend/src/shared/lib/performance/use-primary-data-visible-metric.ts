import type { QueryKey } from "@tanstack/react-query"
import { useLocation } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import {
    type PrimaryDataSource,
    recordPrimaryDataVisible,
} from "@/shared/lib/performance/navigation-metrics"

interface UsePrimaryDataVisibleMetricOptions {
    routeId: string
    isVisible: boolean
    dataSource: PrimaryDataSource
    queryKey?: QueryKey
    itemCount?: number
    detail?: Record<string, string | number | boolean | null>
}

export function usePrimaryDataVisibleMetric({
    routeId,
    isVisible,
    dataSource,
    queryKey,
    itemCount,
    detail,
}: UsePrimaryDataVisibleMetricOptions): void {
    const location = useLocation({
        select: (currentLocation) => ({
            pathname: currentLocation.pathname,
            search: currentLocation.searchStr,
        }),
    })
    const lastMetricKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!isVisible) return

        const pathname = `${location.pathname}${location.search}`
        const metricKey = `${routeId}:${pathname}:${queryKey ? JSON.stringify(queryKey) : ""}`

        if (lastMetricKeyRef.current === metricKey) return
        lastMetricKeyRef.current = metricKey

        recordPrimaryDataVisible({
            routeId,
            pathname,
            dataSource,
            queryKey,
            itemCount,
            detail,
        })
    }, [
        dataSource,
        detail,
        isVisible,
        itemCount,
        location.pathname,
        location.search,
        queryKey,
        routeId,
    ])
}
