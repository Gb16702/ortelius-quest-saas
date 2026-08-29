import { useQueryStates } from "nuqs"
import { useCallback, useMemo } from "react"
import { compoundParsers } from "../../lib/conversation-url.state"
import type { ConversationSort } from "../conversation-sort"
import type { ConversationTypeFilter } from "../conversation-type"

export function useConversationsSearch() {
    const [searchState, setSearchState] = useQueryStates(compoundParsers.conversationsPageState)

    const updateSearch = useCallback(
        (search: string) => {
            setSearchState({
                search,
            })
        },
        [setSearchState]
    )

    const updateFilter = useCallback(
        (filter: "all" | "unread") => {
            setSearchState({
                filter,
            })
        },
        [setSearchState]
    )

    const updateTypeFilter = useCallback(
        (type: ConversationTypeFilter) => {
            setSearchState({
                type,
            })
        },
        [setSearchState]
    )

    const updateSort = useCallback(
        (sort: ConversationSort) => {
            setSearchState({
                sort,
            })
        },
        [setSearchState]
    )

    const clearSearch = useCallback(() => {
        setSearchState({
            search: "",
        })
    }, [setSearchState])

    const hasActiveSearch = useMemo(() => {
        return !!searchState.search?.trim()
    }, [searchState.search])

    return {
        ...searchState,
        hasActiveSearch,
        updateSearch,
        updateFilter,
        updateTypeFilter,
        updateSort,
        clearSearch,
        setSearchState,
    }
}
