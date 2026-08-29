import { useCallback, useMemo, useState } from "react"

export function useMessageSearch() {
    const [search, setSearch] = useState("")

    const updateSearch = useCallback((newSearch: string) => {
        setSearch(newSearch)
    }, [])

    const clearSearch = useCallback(() => {
        setSearch("")
    }, [])

    const hasActiveSearch = useMemo(() => {
        return !!search?.trim()
    }, [search])

    return {
        search,
        hasActiveSearch,
        updateSearch,
        clearSearch,
        setSearch,
    }
}
