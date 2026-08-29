import { keepPreviousData, type QueryKey, useInfiniteQuery } from "@tanstack/react-query"
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { getErrorMessage } from "@/shared/lib/error"
import { showErrorToast } from "@/shared/ui/toasts"
import {
    CONVERSATIONS_PAGE_LIMIT,
    type ConversationFilterType,
    conversationsFeedInfiniteQueryOptions,
} from "../../api/chat.api"
import { chatKeys } from "../../api/chat.query-keys"
import type { Conversation } from "../chat"
import type { ConversationSort } from "../conversation-sort"
import type { ConversationTypeFilter } from "../conversation-type"
import { useMinimumLoadingDelay } from "./use-minimum-loading-delay"

interface UseConversationsFeedOptions {
    userId: string | undefined
    conversationScope: string
    filter: ConversationFilterType
    typeFilter: ConversationTypeFilter
    sort: ConversationSort
    searchQuery: string
}

interface UseConversationsFeedResult {
    conversations: Conversation[]
    isLoadingMore: boolean
    hasMore: boolean
    hasInitialLoad: boolean
    showSpinner: boolean
    isSearching: boolean
    observerTarget: RefObject<HTMLDivElement | null>
    queryKey: QueryKey
    hasData: boolean
    isFetchedAfterMount: boolean
    isPlaceholderData: boolean
    isFetching: boolean
    prepareImmediateFetch: () => void
    setSearchPending: (search: string) => void
    refreshConversations: () => Promise<void>
}

export function useConversationsFeed({
    userId,
    conversationScope,
    filter,
    typeFilter,
    sort,
    searchQuery,
}: UseConversationsFeedOptions): UseConversationsFeedResult {
    const { t } = useTranslation("chat")
    const [isSearching, setIsSearching] = useState(false)
    const [isPreparingFetch, setIsPreparingFetch] = useState(false)
    const [queryParams, setQueryParams] = useState({ filter, typeFilter, sort, searchQuery })
    const isFirstFetch = useRef(true)
    const skipDebounceRef = useRef(false)
    const prevSearchRef = useRef(searchQuery)
    const lastErrorUpdatedAtRef = useRef(0)
    const observerTarget = useRef<HTMLDivElement>(null)
    const showSpinner = useMinimumLoadingDelay(isSearching, 400)
    const queryUserId = userId ?? ""
    const conversationsQueryKey = useMemo(
        () =>
            chatKeys.conversationsFeed({
                userId: queryUserId,
                scope: conversationScope,
                filter: queryParams.filter,
                typeFilter: queryParams.typeFilter,
                sort: queryParams.sort,
                searchQuery: queryParams.searchQuery,
                limit: CONVERSATIONS_PAGE_LIMIT,
            }),
        [
            conversationScope,
            queryParams.filter,
            queryParams.searchQuery,
            queryParams.sort,
            queryParams.typeFilter,
            queryUserId,
        ]
    )
    const conversationsQuery = useInfiniteQuery({
        ...conversationsFeedInfiniteQueryOptions({
            userId: queryUserId,
            scope: conversationScope,
            filter: queryParams.filter,
            typeFilter: queryParams.typeFilter,
            sort: queryParams.sort,
            searchQuery: queryParams.searchQuery,
        }),
        enabled: Boolean(userId),
        placeholderData: keepPreviousData,
    })

    const conversations = useMemo(
        () => conversationsQuery.data?.pages.flatMap((page) => page.conversations) ?? [],
        [conversationsQuery.data]
    )
    const hasMore = conversationsQuery.hasNextPage
    const hasInitialLoad =
        !userId || conversationsQuery.isFetched || Boolean(conversationsQuery.data)
    const isLoadingMore =
        isPreparingFetch ||
        conversationsQuery.isPending ||
        conversationsQuery.isFetching ||
        conversationsQuery.isFetchingNextPage

    const prepareImmediateFetch = useCallback(() => {
        skipDebounceRef.current = true
        setIsPreparingFetch(true)
    }, [])

    const setSearchPending = useCallback((search: string) => {
        setIsSearching(Boolean(search))
    }, [])

    const loadMoreConversations = useCallback(async () => {
        if (
            isPreparingFetch ||
            conversationsQuery.isFetching ||
            conversationsQuery.isFetchingNextPage ||
            !conversationsQuery.hasNextPage
        ) {
            return
        }

        const result = await conversationsQuery.fetchNextPage()
        if (result.isError) {
            console.error("Failed to load more conversations:", result.error)
            showErrorToast(getErrorMessage(result.error, t("toast.loadMoreFailed")), {
                action: {
                    label: t("conversation.tryAgain"),
                    onClick: () => loadMoreRef.current(),
                },
            })
        }
    }, [
        conversationsQuery.fetchNextPage,
        conversationsQuery.hasNextPage,
        conversationsQuery.isFetching,
        conversationsQuery.isFetchingNextPage,
        isPreparingFetch,
        t,
    ])

    const loadMoreRef = useRef(loadMoreConversations)
    loadMoreRef.current = loadMoreConversations

    useEffect(() => {
        const searchChanged = prevSearchRef.current !== searchQuery
        prevSearchRef.current = searchQuery

        const delay = isFirstFetch.current || skipDebounceRef.current ? 0 : 300
        isFirstFetch.current = false
        skipDebounceRef.current = false

        const triggeredBySearch = searchChanged && !!searchQuery
        const debounceTimer = setTimeout(() => {
            if (!userId) {
                setIsSearching(false)
                setIsPreparingFetch(false)
                return
            }

            if (triggeredBySearch) setIsSearching(true)
            setQueryParams({ filter, typeFilter, sort, searchQuery })
            setIsPreparingFetch(false)
        }, delay)

        return () => {
            clearTimeout(debounceTimer)
        }
    }, [searchQuery, filter, typeFilter, sort, userId])

    useEffect(() => {
        if (conversationsQuery.isFetching) return
        setIsSearching(false)
        setIsPreparingFetch(false)
    }, [conversationsQuery.isFetching])

    useEffect(() => {
        if (
            !conversationsQuery.error ||
            conversationsQuery.errorUpdatedAt === lastErrorUpdatedAtRef.current ||
            conversationsQuery.isFetchNextPageError ||
            conversationsQuery.isRefetchError
        ) {
            return
        }

        lastErrorUpdatedAtRef.current = conversationsQuery.errorUpdatedAt
        console.error("Failed to fetch conversations:", conversationsQuery.error)
        showErrorToast(
            getErrorMessage(conversationsQuery.error, t("toast.loadConversationsFailed")),
            {
                action: {
                    label: t("conversation.tryAgain"),
                    onClick: () => {
                        void conversationsQuery.refetch()
                    },
                },
            }
        )
    }, [
        conversationsQuery.error,
        conversationsQuery.errorUpdatedAt,
        conversationsQuery.isFetchNextPageError,
        conversationsQuery.isRefetchError,
        conversationsQuery.refetch,
        t,
    ])

    // biome-ignore lint/correctness/useExhaustiveDependencies: hasMore gates the sentinel's mount in chats-page-content; re-run is required to attach the observer when it (re)appears.
    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadMoreRef.current()
                }
            },
            { threshold: 0.1 }
        )

        const currentTarget = observerTarget.current
        if (currentTarget) {
            observer.observe(currentTarget)
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget)
            }
        }
    }, [hasMore])

    const refreshConversations = useCallback(async () => {
        const result = await conversationsQuery.refetch()
        if (result.isError) {
            console.error("Failed to refresh conversations:", result.error)
            showErrorToast(getErrorMessage(result.error, t("toast.refreshConversationsFailed")), {
                action: {
                    label: t("conversation.tryAgain"),
                    onClick: () => refreshRef.current(),
                },
            })
        }
    }, [conversationsQuery.refetch, t])

    const refreshRef = useRef(refreshConversations)
    refreshRef.current = refreshConversations

    return {
        conversations,
        isLoadingMore,
        hasMore,
        hasInitialLoad,
        showSpinner,
        isSearching,
        observerTarget,
        queryKey: conversationsQueryKey,
        hasData: Boolean(conversationsQuery.data),
        isFetchedAfterMount: conversationsQuery.isFetchedAfterMount,
        isPlaceholderData: conversationsQuery.isPlaceholderData,
        isFetching: conversationsQuery.isFetching,
        prepareImmediateFetch,
        setSearchPending,
        refreshConversations,
    }
}
