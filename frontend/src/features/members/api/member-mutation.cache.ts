import type { QueryClient, QueryKey } from "@tanstack/react-query"

export function restorePreviousQueries(
    queryClient: QueryClient,
    previousData: ReadonlyArray<readonly [QueryKey, unknown]>
) {
    for (const [queryKey, data] of previousData) {
        queryClient.setQueryData(queryKey, data)
    }
}
