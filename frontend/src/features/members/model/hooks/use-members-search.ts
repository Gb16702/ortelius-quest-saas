import { useQueryStates } from "nuqs"
import { startTransition, useCallback, useMemo } from "react"
import { compoundParsers, FILTER_STATES } from "../../lib/member-url.state"

export function useMembersSearch() {
    const [searchState, setSearchState] = useQueryStates(compoundParsers.membersPageState)

    const isLoading = false

    const updateSearch = useCallback(
        (search: string) => {
            startTransition(() => {
                setSearchState({
                    search,
                    page: 1,
                })
            })
        },
        [setSearchState]
    )

    const updateRoles = useCallback(
        (role: string) => {
            setSearchState({
                role,
                page: 1,
            })
        },
        [setSearchState]
    )

    const updateStatus = useCallback(
        (status: string) => {
            setSearchState({
                status,
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

    const hasActiveFilters = useMemo(() => {
        return !!(
            searchState.search?.trim() ||
            (searchState.role && searchState.role !== FILTER_STATES.ROLES.DEFAULT) ||
            (searchState.status &&
                searchState.status !== FILTER_STATES.MEMBER_STATUS.DEFAULT_MEMBERS)
        )
    }, [searchState])

    const clearFilters = useCallback(() => {
        startTransition(() => {
            setSearchState({
                search: "",
                role: FILTER_STATES.ROLES.DEFAULT,
                status: FILTER_STATES.MEMBER_STATUS.DEFAULT_MEMBERS,
                page: 1,
            })
        })
    }, [setSearchState])

    return {
        ...searchState,
        isLoading,
        hasActiveFilters,
        updateSearch,
        updateRoles,
        updateStatus,
        updatePage,
        updatePageSize,
        clearFilters,
        setSearchState,
    }
}
