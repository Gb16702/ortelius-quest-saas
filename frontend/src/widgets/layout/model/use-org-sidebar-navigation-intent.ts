import { useLocation, useRouterState } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"
import { recordNavigationIntent } from "@/shared/lib/performance/navigation-metrics"

interface UseOrgSidebarNavigationIntentOptions {
    onRouteDataIntent?: (to: string) => void
}

function getPathnameFromRouteTarget(to: string): string {
    return to.split("?")[0] ?? to
}

export function useOrgSidebarNavigationIntent({
    onRouteDataIntent,
}: UseOrgSidebarNavigationIntentOptions) {
    const pathname = useLocation({ select: (location) => location.pathname })
    const search = useLocation({ select: (location) => location.searchStr })
    const pendingPathname = useRouterState({
        select: (state) => (state.status === "pending" ? state.location.pathname : null),
    })
    const [optimisticPathname, setOptimisticPathname] = useState<string | null>(null)
    const visiblePathname = pendingPathname ?? optimisticPathname ?? pathname

    const recordSidebarNavigationIntent = useCallback(
        (to: string, trigger: "click" | "focus" | "hover", label: string) => {
            if (trigger === "click") {
                const nextPathname = getPathnameFromRouteTarget(to)
                if (nextPathname !== pathname) {
                    setOptimisticPathname(nextPathname)
                }
            }

            recordNavigationIntent({
                from: `${pathname}${search}`,
                to,
                trigger,
                label,
            })
            onRouteDataIntent?.(to)
        },
        [pathname, search, onRouteDataIntent]
    )

    useEffect(() => {
        if (!optimisticPathname) return
        if (pathname === optimisticPathname) {
            setOptimisticPathname(null)
            return
        }

        const timeout = window.setTimeout(() => setOptimisticPathname(null), 10_000)
        return () => window.clearTimeout(timeout)
    }, [pathname, optimisticPathname])

    return {
        location: { pathname, search },
        visiblePathname,
        recordSidebarNavigationIntent,
    }
}
