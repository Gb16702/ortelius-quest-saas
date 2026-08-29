import { useQueryStates } from "nuqs"
import { startTransition, useCallback, useMemo } from "react"
import { normalizeRequestDateFilterValues } from "../../lib/request-filters"
import { compoundParsers, FILTER_STATES } from "../../lib/request-url.state"

export function useRequestsSearch() {
    const [searchState, setSearchState] = useQueryStates(compoundParsers.requestsPageState)

    const isLoading = false
    const isSearching = false

    const updateSearch = useCallback(
        (search: string) => {
            setSearchState({
                search,
                page: 1,
            })
        },
        [setSearchState]
    )

    const updateStatus = useCallback(
        (lifecycleStatus: string) => {
            setSearchState({
                lifecycleStatus,
                page: 1,
            })
        },
        [setSearchState]
    )

    const updateDateRange = useCallback(
        (fromDate: string | null, toDate: string | null) => {
            setSearchState({
                fromDate: fromDate || "",
                toDate: toDate || "",
                page: 1,
            })
        },
        [setSearchState]
    )

    const updateAssignedTo = useCallback(
        (assignedTo: string[]) => {
            setSearchState({
                assignedTo: assignedTo.join(","),
                page: 1,
            })
        },
        [setSearchState]
    )

    const updatePriority = useCallback(
        (priority: string[]) => {
            setSearchState({
                priority: priority.join(","),
                page: 1,
            })
        },
        [setSearchState]
    )

    const updatePage = useCallback(
        (page: number) => {
            setSearchState({ page })
        },
        [setSearchState]
    )

    const updatePageSize = useCallback(
        (limit: number) => {
            setSearchState({
                limit,
                page: 1,
            })
        },
        [setSearchState]
    )

    const normalizedDateFilters = useMemo(
        () => normalizeRequestDateFilterValues(searchState.fromDate, searchState.toDate),
        [searchState.fromDate, searchState.toDate]
    )

    const hasActiveFilters = useMemo(() => {
        return !!(
            searchState.search?.trim() ||
            (searchState.lifecycleStatus &&
                searchState.lifecycleStatus !== FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT) ||
            searchState.closedReason ||
            searchState.assignedTo ||
            searchState.priority ||
            normalizedDateFilters.from ||
            normalizedDateFilters.to
        )
    }, [searchState, normalizedDateFilters])

    const clearFilters = useCallback(() => {
        startTransition(() => {
            setSearchState({
                search: "",
                lifecycleStatus: FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT,
                closedReason: "",
                assignedTo: "",
                priority: "",
                fromDate: "",
                toDate: "",
                page: 1,
            })
        })
    }, [setSearchState])

    return {
        ...searchState,
        fromDate: normalizedDateFilters.from,
        toDate: normalizedDateFilters.to,
        isLoading,
        isSearching,
        hasActiveFilters,

        updateSearch,
        updateStatus,
        updateAssignedTo,
        updatePriority,
        updateDateRange,
        updatePage,
        updatePageSize,
        clearFilters,

        setSearchState,
    }
}
