import { type QueryClient, type QueryKey, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import { recordQueryPrefetchComplete } from "@/shared/lib/performance/navigation-metrics"
import {
    CHAT_INITIAL_DATA_STALE_MS,
    chatMessagesPageQueryOptions,
    initialConversationsPageQueryOptions,
} from "../../api/chat.api"

const CHAT_CONVERSATION_PREFETCH_INTENT_DELAY_MS = 150
const CHAT_CONVERSATION_PREFETCH_THROTTLE_MS = 500

interface UseChatConversationPrefetchOptions {
    userId: string | undefined
    scope: string
    conversationId: string
}

interface ChatConversationPrefetch {
    prefetchConversation: () => void
    prefetchConversationNow: () => void
    cancelConversationPrefetch: () => void
}

export function useChatConversationPrefetch({
    userId,
    scope,
    conversationId,
}: UseChatConversationPrefetchOptions): ChatConversationPrefetch {
    const queryClient = useQueryClient()
    const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastPrefetchStartedAtRef = useRef(0)

    const cancelConversationPrefetch = useCallback(() => {
        if (!intentTimerRef.current) return
        clearTimeout(intentTimerRef.current)
        intentTimerRef.current = null
    }, [])

    const prefetchConversationNow = useCallback(() => {
        cancelConversationPrefetch()

        if (!userId || !conversationId) return

        const now = Date.now()
        if (now - lastPrefetchStartedAtRef.current < CHAT_CONVERSATION_PREFETCH_THROTTLE_MS) {
            return
        }
        lastPrefetchStartedAtRef.current = now

        prefetchChatConversationQueries({
            queryClient,
            userId,
            scope,
            conversationId,
            now,
        })
    }, [cancelConversationPrefetch, conversationId, queryClient, scope, userId])

    const prefetchConversation = useCallback(() => {
        cancelConversationPrefetch()

        if (!userId || !conversationId) return

        intentTimerRef.current = setTimeout(() => {
            intentTimerRef.current = null
            prefetchConversationNow()
        }, CHAT_CONVERSATION_PREFETCH_INTENT_DELAY_MS)
    }, [cancelConversationPrefetch, conversationId, prefetchConversationNow, userId])

    useEffect(() => cancelConversationPrefetch, [cancelConversationPrefetch])

    return {
        prefetchConversation,
        prefetchConversationNow,
        cancelConversationPrefetch,
    }
}

function prefetchChatConversationQueries({
    queryClient,
    userId,
    scope,
    conversationId,
    now,
}: {
    queryClient: QueryClient
    userId: string
    scope: string
    conversationId: string
    now: number
}): void {
    const messagesPageOptions = chatMessagesPageQueryOptions({
        userId,
        scope,
        conversationId,
    })
    const conversationsPageOptions = initialConversationsPageQueryOptions({
        userId,
        scope,
    })

    if (!hasFreshQueryData(queryClient, messagesPageOptions.queryKey, now)) {
        recordPrefetch(
            queryClient.prefetchQuery(messagesPageOptions),
            getChatPrefetchRouteId(scope, "messages"),
            messagesPageOptions.queryKey
        )
    }

    if (!hasFreshQueryData(queryClient, conversationsPageOptions.queryKey, now)) {
        recordPrefetch(
            queryClient.prefetchQuery(conversationsPageOptions),
            getChatPrefetchRouteId(scope, "conversations"),
            conversationsPageOptions.queryKey
        )
    }
}

function hasFreshQueryData(queryClient: QueryClient, queryKey: QueryKey, now: number): boolean {
    const state = queryClient.getQueryState(queryKey)
    if (!state || state.status !== "success" || state.isInvalidated) return false

    return now - state.dataUpdatedAt < CHAT_INITIAL_DATA_STALE_MS
}

function recordPrefetch(promise: Promise<unknown>, routeId: string, queryKey: QueryKey): void {
    promise
        .then(() => {
            recordQueryPrefetchComplete({ routeId, queryKey })
        })
        .catch(() => {
            // React Query keeps the cache state authoritative; failed hover prefetches
            // should stay quiet until the user actually navigates or retries.
        })
}

function getChatPrefetchRouteId(scope: string, target: "messages" | "conversations"): string {
    const prefix = scope.startsWith("/org/") ? "org" : "me"
    return `${prefix}.chat.${target}.intent`
}
