import { QueryCache, QueryClient } from "@tanstack/react-query"

/**
 * QueryClient tuned for tests:
 * - `retry: false` so failed queries do not multiply timeouts.
 * - `gcTime: Infinity` so cached data survives the unmount/remount cycle a
 *   test triggers when re-rendering with `rerender(...)`.
 * - `staleTime: Infinity` so re-mounting a component (e.g. inside
 *   `rerender`) does not silently refire the network call against MSW.
 *   Without this, every parent re-render against the same key triggers
 *   another `queryFn` and hides which interactions actually fetch.
 * - `queryCache.onError: noop` so tests that intentionally fail a query
 *   don't pollute the runner output with unhandled-error logs.
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        queryCache: new QueryCache({ onError: () => {} }),
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Number.POSITIVE_INFINITY,
                staleTime: Number.POSITIVE_INFINITY,
            },
            mutations: {
                retry: false,
            },
        },
    })
}
