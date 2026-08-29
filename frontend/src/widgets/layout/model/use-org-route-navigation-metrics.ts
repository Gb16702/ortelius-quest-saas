import { useLocation, useRouterState } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import {
    recordRouteCommitted,
    recordRouteTransitionIdle,
    recordRouteTransitionStart,
} from "@/shared/lib/performance/navigation-metrics"

export function useOrgRouteNavigationMetrics(): void {
    const currentPath = useLocation({
        select: (location) => `${location.pathname}${location.searchStr}`,
    })
    const pendingPath = useRouterState({
        select: (state) =>
            state.status === "pending"
                ? `${state.location.pathname}${state.location.searchStr}`
                : null,
    })
    const isPending = useRouterState({ select: (state) => state.status === "pending" })
    const previousPathRef = useRef(currentPath)
    const navigationStateRef = useRef(isPending ? "loading" : "idle")

    useEffect(() => {
        if (previousPathRef.current === currentPath) return

        previousPathRef.current = currentPath
        recordRouteCommitted({ pathname: currentPath })
    }, [currentPath])

    useEffect(() => {
        if (isPending && pendingPath && navigationStateRef.current !== "loading") {
            recordRouteTransitionStart({
                from: currentPath,
                to: pendingPath,
            })
        }

        if (!isPending && navigationStateRef.current !== "idle") {
            recordRouteTransitionIdle({ pathname: currentPath })
        }

        navigationStateRef.current = isPending ? "loading" : "idle"
    }, [currentPath, isPending, pendingPath])
}
