import {
    createContext,
    type ReactNode,
    type RefObject,
    use,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import type { SessionResponse } from "@/entities/session"
import { useSearchKeyboardShortcuts } from "@/shared/lib/hooks/use-search-keyboard-shortcuts"
import { getModifierKey } from "@/shared/lib/keyboard"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import type { BreadcrumbNavItem } from "@/shared/ui/breadcrumb-nav"
import type { ConversationFilterType } from "../api/chat.api"
import { countUnreadConversations, hasActiveConversationFilters } from "../lib/conversation-list"
import type { Conversation } from "./chat"
import type { ConversationSort } from "./conversation-sort"
import type { ConversationTypeFilter } from "./conversation-type"
import { useChatConversationPinActions } from "./hooks/use-chat-conversation-pin-actions"
import { useChatsRealtimeEvents } from "./hooks/use-chats-realtime-events"
import { useConversationsFeed } from "./hooks/use-conversations-feed"
import { useConversationsSearch } from "./hooks/use-conversations-search"

export type FilterType = ConversationFilterType

interface ChatsPageState {
    conversations: Conversation[]
    isLoadingMore: boolean
    hasMore: boolean
    hasInitialLoad: boolean
    modifierKey: string
    showSpinner: boolean
    isSearching: boolean
    searchQuery: string
    filter: FilterType
    conversationTypeFilter: ConversationTypeFilter
    conversationSort: ConversationSort
    hasOrganization: boolean
    unreadCount: number
    hasActiveFilters: boolean
    breadcrumbItems: BreadcrumbNavItem[]
    basePath: string
    hrefBasePath: string
    currentUserId: string
    onNavigate?: (href: string) => void
}

interface ChatsPageActions {
    applyConversationFilter: (newFilter: FilterType) => void
    applyConversationTypeFilter: (newTypeFilter: ConversationTypeFilter) => void
    applyConversationSort: (newSort: ConversationSort) => void
    updateSearch: (search: string) => void
    clearAllFilters: () => void
    refreshConversations: () => Promise<void>
    toggleConversationPin: (
        conversation: Conversation,
        nextValue: boolean,
        currentValue: boolean
    ) => void
}

interface ChatsPageRefs {
    observerTarget: RefObject<HTMLDivElement | null>
    searchInputRef: RefObject<HTMLInputElement | null>
}

interface ChatsPageMeta {
    userId: string
    basePath: string
    hasOrganization: boolean
    refs: ChatsPageRefs
}

interface ChatsPageContextValue {
    state: ChatsPageState
    actions: ChatsPageActions
    meta: ChatsPageMeta
}

const ChatsPageContext = createContext<ChatsPageContextValue | null>(null)

export function useChatsPage(): ChatsPageContextValue {
    const ctx = use(ChatsPageContext)
    if (!ctx) {
        throw new Error("useChatsPage must be used within ChatsPageProvider")
    }
    return ctx
}

export function useChatsState(): ChatsPageState {
    return useChatsPage().state
}

export function useChatsActions(): ChatsPageActions {
    return useChatsPage().actions
}

export function useChatsRefs(): ChatsPageRefs {
    return useChatsPage().meta.refs
}

interface ChatsPageProviderProps {
    sessionData: SessionResponse | null
    basePath: string
    hrefBasePath?: string
    breadcrumbItemsPrefix?: BreadcrumbNavItem[]
    onNavigate?: (href: string) => void
    children: ReactNode
}

export function ChatsPageProvider({
    sessionData,
    basePath,
    hrefBasePath = basePath,
    breadcrumbItemsPrefix = [],
    onNavigate,
    children,
}: ChatsPageProviderProps) {
    const { t } = useTranslation("chat")
    const {
        search: searchQuery,
        filter,
        type: conversationTypeFilter,
        sort: conversationSort,
        updateSearch: updateSearchQuery,
        updateFilter,
        updateTypeFilter,
        updateSort,
        clearSearch,
    } = useConversationsSearch()

    const [modifierKey, setModifierKey] = useState("\u2318")
    const conversationScope = basePath
    const searchInputRef = useRef<HTMLInputElement>(null)

    const {
        conversations,
        isLoadingMore,
        hasMore,
        hasInitialLoad,
        showSpinner,
        isSearching,
        observerTarget,
        queryKey,
        hasData,
        isFetchedAfterMount,
        isPlaceholderData,
        isFetching,
        prepareImmediateFetch,
        setSearchPending,
        refreshConversations,
    } = useConversationsFeed({
        userId: sessionData?.user?.id,
        conversationScope,
        filter,
        typeFilter: conversationTypeFilter,
        sort: conversationSort,
        searchQuery,
    })
    const toggleConversationPin = useChatConversationPinActions({
        userId: sessionData?.user?.id,
        organizationId: sessionData?.session?.activeOrganizationId ?? undefined,
        conversationScope,
    })

    useSearchKeyboardShortcuts({
        searchInputRef,
        hasSearchValue: !!searchQuery,
        onClear: clearSearch,
    })

    useEffect(() => {
        setModifierKey(getModifierKey())
    }, [])

    const applyConversationFilter = useCallback(
        (newFilter: FilterType) => {
            if (newFilter === filter) return
            prepareImmediateFetch()
            updateFilter(newFilter)
        },
        [filter, prepareImmediateFetch, updateFilter]
    )

    const applyConversationTypeFilter = useCallback(
        (newTypeFilter: ConversationTypeFilter) => {
            if (newTypeFilter === conversationTypeFilter) return
            prepareImmediateFetch()
            updateTypeFilter(newTypeFilter)
        },
        [conversationTypeFilter, prepareImmediateFetch, updateTypeFilter]
    )

    const applyConversationSort = useCallback(
        (newSort: ConversationSort) => {
            if (newSort === conversationSort) return
            prepareImmediateFetch()
            updateSort(newSort)
        },
        [conversationSort, prepareImmediateFetch, updateSort]
    )

    useChatsRealtimeEvents({
        currentUserId: sessionData?.user?.id,
        conversationScope,
    })

    const breadcrumbItems = useMemo(
        () => [...breadcrumbItemsPrefix, { label: t("page.title") }],
        [breadcrumbItemsPrefix, t]
    )

    const hasOrganization = useMemo(
        () => !!sessionData?.session?.activeOrganizationId,
        [sessionData?.session?.activeOrganizationId]
    )
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey,
        hasData,
        isFetchedAfterMount,
        isFetching,
        isPlaceholderData,
    })

    usePrimaryDataVisibleMetric({
        routeId: basePath.startsWith("/org/") ? "org.chats" : "me.chats",
        isVisible: hasInitialLoad && hasData,
        dataSource: primaryDataSource,
        queryKey,
        itemCount: conversations.length,
        detail: {
            filter,
            type: conversationTypeFilter,
            sort: conversationSort,
            search: searchQuery ? "active" : "empty",
        },
    })

    const unreadCount = useMemo(() => countUnreadConversations(conversations), [conversations])

    const hasActiveFilters = useMemo(
        () =>
            hasActiveConversationFilters({
                searchQuery,
                filter,
                typeFilter: conversationTypeFilter,
                sort: conversationSort,
            }),
        [searchQuery, filter, conversationTypeFilter, conversationSort]
    )

    const updateSearch = useCallback(
        (search: string) => {
            setSearchPending(search)
            updateSearchQuery(search)
        },
        [setSearchPending, updateSearchQuery]
    )

    const clearAllFilters = useCallback(() => {
        setSearchPending("")
        clearSearch()
        updateFilter("all")
        updateTypeFilter("all")
        updateSort("newest")
    }, [clearSearch, setSearchPending, updateFilter, updateTypeFilter, updateSort])

    const stateValue = useMemo<ChatsPageState>(
        () => ({
            conversations,
            isLoadingMore,
            hasMore,
            hasInitialLoad,
            modifierKey,
            showSpinner,
            isSearching,
            searchQuery,
            filter: filter as FilterType,
            conversationTypeFilter,
            conversationSort,
            hasOrganization,
            unreadCount,
            hasActiveFilters,
            breadcrumbItems,
            basePath,
            hrefBasePath,
            currentUserId: sessionData?.user?.id ?? "",
            onNavigate,
        }),
        [
            conversations,
            isLoadingMore,
            hasMore,
            hasInitialLoad,
            modifierKey,
            showSpinner,
            isSearching,
            searchQuery,
            filter,
            conversationTypeFilter,
            conversationSort,
            hasOrganization,
            unreadCount,
            hasActiveFilters,
            breadcrumbItems,
            basePath,
            hrefBasePath,
            sessionData?.user?.id,
            onNavigate,
        ]
    )

    const actionsValue = useMemo<ChatsPageActions>(
        () => ({
            applyConversationFilter,
            applyConversationTypeFilter,
            applyConversationSort,
            updateSearch,
            clearAllFilters,
            refreshConversations,
            toggleConversationPin,
        }),
        [
            applyConversationFilter,
            applyConversationTypeFilter,
            applyConversationSort,
            updateSearch,
            clearAllFilters,
            refreshConversations,
            toggleConversationPin,
        ]
    )

    const refsValue = useRef<ChatsPageRefs>({
        observerTarget,
        searchInputRef,
    }).current

    const metaValue = useMemo<ChatsPageMeta>(
        () => ({
            userId: sessionData?.user?.id ?? "",
            basePath,
            hasOrganization,
            refs: refsValue,
        }),
        [sessionData?.user?.id, basePath, hasOrganization, refsValue]
    )

    const contextValue = useMemo<ChatsPageContextValue>(
        () => ({
            state: stateValue,
            actions: actionsValue,
            meta: metaValue,
        }),
        [stateValue, actionsValue, metaValue]
    )

    return <ChatsPageContext value={contextValue}>{children}</ChatsPageContext>
}
