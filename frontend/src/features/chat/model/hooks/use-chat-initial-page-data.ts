import { useQuery } from "@tanstack/react-query"
import { type Dispatch, useCallback, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
    recordPrimaryDataVisible,
} from "@/shared/lib/performance/navigation-metrics"
import { showRetryErrorToast } from "@/shared/ui/toasts"
import {
    chatMessagesPageQueryOptions,
    type InitialChatPageData,
    initialConversationsPageQueryOptions,
    MESSAGE_PAGE_LIMIT,
    readInitialChatPageData,
} from "../../api/chat.api"
import { chatKeys } from "../../api/chat.query-keys"
import type { ChatMessagesPageResponse, MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import {
    type ChatConversationLoadState,
    getChatConversationLoadState,
} from "../chat-conversation-access"

interface InitialMessagePage {
    messages: MessageData[]
    pagination: ChatMessagesPageResponse["data"]["pagination"]
}

interface UseChatInitialPageDataOptions {
    conversationId: string | undefined
    userId: string | undefined
    basePath: string
    initialPageData: InitialChatPageData | null
    dispatch: Dispatch<ChatAction>
    setInitialMessagePage: (page: InitialMessagePage) => void
}

interface UseChatInitialPageDataResult {
    conversationLoadState: ChatConversationLoadState
    retryInitialLoad: () => void
}

export function useChatInitialPageData({
    conversationId,
    userId,
    basePath,
    initialPageData,
    dispatch,
    setInitialMessagePage,
}: UseChatInitialPageDataOptions): UseChatInitialPageDataResult {
    const { t } = useTranslation("chat")
    const queryUserId = userId ?? ""
    const queryConversationId = conversationId ?? ""
    const initialData = useMemo(
        () =>
            isMatchingInitialPageData({
                initialPageData,
                userId,
                scope: basePath,
                conversationId,
            })
                ? initialPageData
                : null,
        [basePath, conversationId, initialPageData, userId]
    )
    const messagesQueryKey = useMemo(
        () =>
            chatKeys.messagesPage({
                userId: queryUserId,
                scope: basePath,
                conversationId: queryConversationId,
                limit: MESSAGE_PAGE_LIMIT,
                offset: 0,
            }),
        [basePath, queryConversationId, queryUserId]
    )

    const messagesQuery = useQuery({
        ...chatMessagesPageQueryOptions({
            userId: queryUserId,
            scope: basePath,
            conversationId: queryConversationId,
        }),
        enabled: Boolean(userId && conversationId),
        initialData: initialData?.messagesPage,
    })
    const conversationsQuery = useQuery({
        ...initialConversationsPageQueryOptions({
            userId: queryUserId,
            scope: basePath,
        }),
        enabled: Boolean(userId && conversationId),
        initialData: initialData?.conversationsPage,
    })

    const shouldShowInitialLoading = Boolean(
        userId &&
            conversationId &&
            (!messagesQuery.data || !conversationsQuery.data) &&
            (messagesQuery.isPending ||
                messagesQuery.isFetching ||
                conversationsQuery.isPending ||
                conversationsQuery.isFetching)
    )
    const conversationLoadState = useMemo(
        () =>
            getChatConversationLoadState({
                hasRequiredInputs: Boolean(userId && conversationId),
                hasMessagesData: Boolean(messagesQuery.data),
                hasConversationsData: Boolean(conversationsQuery.data),
                isLoading: shouldShowInitialLoading,
                messagesError: messagesQuery.error,
                conversationsError: conversationsQuery.error,
            }),
        [
            conversationId,
            conversationsQuery.data,
            conversationsQuery.error,
            messagesQuery.data,
            messagesQuery.error,
            shouldShowInitialLoading,
            userId,
        ]
    )
    const retryInitialLoad = useCallback(() => {
        void messagesQuery.refetch()
        void conversationsQuery.refetch()
    }, [conversationsQuery.refetch, messagesQuery.refetch])

    useEffect(() => {
        dispatch({ type: "SET_INITIAL_LOADING", loading: shouldShowInitialLoading })
    }, [dispatch, shouldShowInitialLoading])

    const lastRecordedMetricKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!conversationId || !userId || !messagesQuery.data || !conversationsQuery.data) return

        const pageData: InitialChatPageData = {
            userId,
            scope: basePath,
            conversationId,
            messagesPage: messagesQuery.data,
            conversationsPage: conversationsQuery.data,
        }
        const { messages, pagination, conversations } = readInitialChatPageData(pageData)

        dispatch({ type: "SET_ALL_MESSAGES", messages })
        setInitialMessagePage({ messages, pagination })
        dispatch({
            type: "SET_CONVERSATIONS",
            conversations,
        })

        const metricKey = `${conversationId}:${messagesQuery.dataUpdatedAt}:${conversationsQuery.dataUpdatedAt}`
        if (lastRecordedMetricKeyRef.current === metricKey) return
        lastRecordedMetricKeyRef.current = metricKey

        const dataSource: PrimaryDataSource = getQueryPrimaryDataSource({
            queryKey: messagesQueryKey,
            hasData: true,
            isFetchedAfterMount: messagesQuery.isFetchedAfterMount,
            isFetching: messagesQuery.isFetching,
        })

        recordPrimaryDataVisible({
            routeId: basePath.startsWith("/org/")
                ? "org.chat.conversation"
                : "me.chat.conversation",
            pathname: getCurrentBrowserPathnameWithSearch(),
            dataSource,
            queryKey: messagesQueryKey,
            itemCount: messages.length,
            detail: {
                conversationId,
                conversations: conversations.length,
            },
        })
    }, [
        basePath,
        conversationId,
        conversationsQuery.data,
        conversationsQuery.dataUpdatedAt,
        dispatch,
        messagesQuery.data,
        messagesQuery.dataUpdatedAt,
        messagesQuery.isFetchedAfterMount,
        messagesQuery.isFetching,
        messagesQueryKey,
        setInitialMessagePage,
        userId,
    ])

    const latestErrorUpdatedAt = Math.max(
        messagesQuery.errorUpdatedAt,
        conversationsQuery.errorUpdatedAt
    )
    const latestError = messagesQuery.error ?? conversationsQuery.error
    const lastErrorUpdatedAtRef = useRef(0)

    useEffect(() => {
        if (
            !latestError ||
            latestErrorUpdatedAt === lastErrorUpdatedAtRef.current ||
            conversationLoadState.status === "forbidden" ||
            conversationLoadState.status === "not-found"
        )
            return

        lastErrorUpdatedAtRef.current = latestErrorUpdatedAt
        console.error("Failed to fetch initial data:", latestError)
        showRetryErrorToast(t("toast.loadConversationFailed"), {
            onRetry: retryInitialLoad,
        })
    }, [conversationLoadState.status, latestError, latestErrorUpdatedAt, retryInitialLoad, t])

    return {
        conversationLoadState,
        retryInitialLoad,
    }
}

function isMatchingInitialPageData({
    initialPageData,
    userId,
    scope,
    conversationId,
}: {
    initialPageData: InitialChatPageData | null
    userId: string | undefined
    scope: string
    conversationId: string | undefined
}): boolean {
    return Boolean(
        initialPageData &&
            initialPageData.userId === userId &&
            initialPageData.scope === scope &&
            initialPageData.conversationId === conversationId
    )
}

function getCurrentBrowserPathnameWithSearch(): string {
    if (typeof window === "undefined") return ""
    return `${window.location.pathname}${window.location.search}`
}
