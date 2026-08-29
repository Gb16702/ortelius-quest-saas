import { useCallback, useEffect, useMemo } from "react"

interface UseIdlePreloadOptions {
    enabled?: boolean
    delayMs?: number
}

interface UseIdlePreloadResult {
    preload: () => Promise<unknown>
}

export function useIdlePreload(
    preload: () => Promise<unknown>,
    { enabled = true, delayMs = 800 }: UseIdlePreloadOptions = {}
): UseIdlePreloadResult {
    const preloadNow = useCallback(() => {
        return preload()
    }, [preload])

    useEffect(() => {
        if (!enabled) return

        const timeoutId = window.setTimeout(() => {
            void preloadNow().catch(() => undefined)
        }, delayMs)

        return () => window.clearTimeout(timeoutId)
    }, [delayMs, enabled, preloadNow])

    return useMemo(
        () => ({
            preload: preloadNow,
        }),
        [preloadNow]
    )
}
