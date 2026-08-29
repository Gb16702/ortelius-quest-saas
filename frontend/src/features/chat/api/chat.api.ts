import { type QueryClient, queryOptions } from "@tanstack/react-query"
import type * as v from "valibot"
import { createApiError, readJsonResponse } from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type {
    ChatConversationsResponse,
    ChatMessagesPageResponse,
    Conversation,
    MessageData,
} from "../model/chat"
import type { ConversationSort } from "../model/conversation-sort"
import type { ConversationTypeFilter } from "../model/conversation-type"
import {
    chatConversationsResponseSchema,
    chatMessagesPageResponseSchema,
    conversationsListResponseSchema,
    messageDataSchema,
} from "../model/schemas/chats.schema"
import type { ConversationFilterType } from "./chat.query-keys"
import { CONVERSATIONS_PAGE_LIMIT, chatKeys, MESSAGE_PAGE_LIMIT } from "./chat.query-keys"

export type { ConversationFilterType } from "./chat.query-keys"
export { CONVERSATIONS_PAGE_LIMIT, MESSAGE_PAGE_LIMIT } from "./chat.query-keys"

export const CHAT_INITIAL_DATA_STALE_MS = 60_000
export const CHATS_INITIAL_DATA_STALE_MS = 60_000
export const SIDEBAR_MEMBER_CONVERSATION_LIMIT = 50

interface FetchInitialChatPageDataOptions {
    queryClient: QueryClient
    userId: string
    scope: string
    conversationId: string
}

interface FetchInitialChatPageDataResult {
    messages: MessageData[]
    conversations: Conversation[]
    pagination: ChatMessagesPageResponse["data"]["pagination"]
}

interface FetchChatMessagesPageOptions {
    conversationId: string
    offset: number
    signal?: AbortSignal
    limit?: number
}

interface FetchConversationsPageOptions {
    offset: number
    filter: ConversationFilterType
    typeFilter: ConversationTypeFilter
    sort: ConversationSort
    searchQuery: string
    signal?: AbortSignal
    limit?: number
}

interface ConversationsFeedQueryOptionsInput {
    userId: string
    scope: string
    filter: ConversationFilterType
    typeFilter: ConversationTypeFilter
    sort: ConversationSort
    searchQuery: string
    limit?: number
}

interface OrgSidebarMemberConversationsQueryOptionsInput {
    userId: string
    organizationId: string
}

interface ChatMessagesPageQueryOptionsInput {
    userId: string
    scope: string
    conversationId: string
    limit?: number
    offset?: number
    fetchMessagesPage?: typeof fetchChatMessagesPage
}

interface InitialConversationsPageQueryOptionsInput {
    userId: string
    scope: string
    limit?: number
    offset?: number
    fetchConversationsPage?: typeof fetchInitialConversationsPage
}

export interface ConversationsPageResult {
    conversations: Conversation[]
    hasMore: boolean
}

export interface InitialChatPageData {
    userId: string
    scope: string
    conversationId: string
    messagesPage: ChatMessagesPageResponse
    conversationsPage: ChatConversationsResponse
}

export interface InitialChatPageDataResult {
    messages: MessageData[]
    conversations: Conversation[]
    pagination: ChatMessagesPageResponse["data"]["pagination"]
}

export async function fetchInitialChatPageData({
    queryClient,
    userId,
    scope,
    conversationId,
}: FetchInitialChatPageDataOptions): Promise<FetchInitialChatPageDataResult> {
    const [messagesPage, conversationsPage] = await Promise.all([
        queryClient.fetchQuery(
            chatMessagesPageQueryOptions({
                userId,
                scope,
                conversationId,
            })
        ),
        queryClient.fetchQuery(
            initialConversationsPageQueryOptions({
                userId,
                scope,
            })
        ),
    ])

    return readInitialChatPageData({
        userId,
        scope,
        conversationId,
        messagesPage,
        conversationsPage,
    })
}

export function chatMessagesPageQueryOptions({
    userId,
    scope,
    conversationId,
    limit = MESSAGE_PAGE_LIMIT,
    offset = 0,
    fetchMessagesPage = fetchChatMessagesPage,
}: ChatMessagesPageQueryOptionsInput) {
    return queryOptions({
        queryKey: chatKeys.messagesPage({
            userId,
            scope,
            conversationId,
            limit,
            offset,
        }),
        queryFn: ({ signal }) => fetchMessagesPage({ conversationId, offset, limit, signal }),
        staleTime: CHAT_INITIAL_DATA_STALE_MS,
        refetchOnReconnect: "always" as const,
        refetchOnWindowFocus: false,
    })
}

export function initialConversationsPageQueryOptions({
    userId,
    scope,
    limit = CONVERSATIONS_PAGE_LIMIT,
    offset = 0,
    fetchConversationsPage = fetchInitialConversationsPage,
}: InitialConversationsPageQueryOptionsInput) {
    return queryOptions({
        queryKey: chatKeys.initialConversationsPage({
            userId,
            scope,
            limit,
            offset,
        }),
        queryFn: ({ signal }) => fetchConversationsPage({ offset, limit, signal }),
        staleTime: CHAT_INITIAL_DATA_STALE_MS,
        refetchOnReconnect: "always" as const,
        refetchOnWindowFocus: false,
    })
}

export function readInitialChatPageData({
    messagesPage,
    conversationsPage,
}: InitialChatPageData): InitialChatPageDataResult {
    return {
        messages: messagesPage.data.messages,
        conversations: conversationsPage.data.conversations,
        pagination: messagesPage.data.pagination,
    }
}

export function conversationsFeedInfiniteQueryOptions({
    userId,
    scope,
    filter,
    typeFilter,
    sort,
    searchQuery,
    limit = CONVERSATIONS_PAGE_LIMIT,
}: ConversationsFeedQueryOptionsInput) {
    return {
        queryKey: chatKeys.conversationsFeed({
            userId,
            scope,
            filter,
            typeFilter,
            sort,
            searchQuery,
            limit,
        }),
        queryFn: ({ pageParam, signal }: { pageParam: unknown; signal: AbortSignal }) =>
            fetchConversationsPage({
                offset: typeof pageParam === "number" ? pageParam : 0,
                filter,
                typeFilter,
                sort,
                searchQuery,
                signal,
                limit,
            }),
        initialPageParam: 0,
        getNextPageParam: (
            lastPage: ConversationsPageResult,
            _pages: ConversationsPageResult[],
            lastPageParam: number
        ) => (lastPage.hasMore ? lastPageParam + limit : undefined),
        staleTime: CHATS_INITIAL_DATA_STALE_MS,
        refetchOnReconnect: "always" as const,
        refetchOnWindowFocus: false,
    }
}

export function orgSidebarMemberConversationsQueryOptions({
    userId,
    organizationId,
}: OrgSidebarMemberConversationsQueryOptionsInput) {
    return queryOptions({
        queryKey: chatKeys.conversationsFeed({
            userId,
            scope: `${organizationId}:sidebar-members`,
            filter: "all",
            typeFilter: "member_dm",
            sort: "newest",
            searchQuery: "",
            limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
        }),
        queryFn: ({ signal }) =>
            fetchConversationsPage({
                offset: 0,
                filter: "all",
                typeFilter: "member_dm",
                sort: "newest",
                searchQuery: "",
                signal,
                limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
            }),
        staleTime: CHATS_INITIAL_DATA_STALE_MS,
        refetchOnWindowFocus: false,
    })
}

export function fetchChatMessagesPage({
    conversationId,
    offset,
    limit = MESSAGE_PAGE_LIMIT,
    signal,
}: FetchChatMessagesPageOptions): Promise<ChatMessagesPageResponse> {
    return fetchChatJson<ChatMessagesPageResponse>(
        `/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        "Failed to load earlier messages",
        chatMessagesPageResponseSchema,
        signal
    )
}

export function fetchInitialConversationsPage({
    offset,
    signal,
    limit = CONVERSATIONS_PAGE_LIMIT,
}: Pick<
    FetchConversationsPageOptions,
    "offset" | "signal" | "limit"
>): Promise<ChatConversationsResponse> {
    return fetchChatJson<ChatConversationsResponse>(
        `/api/conversations?limit=${limit}&offset=${offset}`,
        "Failed to fetch conversations",
        chatConversationsResponseSchema,
        signal
    )
}

export async function fetchConversationsPage({
    offset,
    filter,
    typeFilter,
    sort,
    searchQuery,
    signal,
    limit = CONVERSATIONS_PAGE_LIMIT,
}: FetchConversationsPageOptions): Promise<ConversationsPageResult> {
    const response = await fetch(
        getConversationsUrl({ limit, offset, filter, typeFilter, sort, searchQuery }),
        {
            credentials: "include",
            signal,
        }
    )
    const json = await readJsonResponse(response)

    if (!response.ok) {
        throw createApiError(response.status, json, "Failed to fetch conversations")
    }

    const parsed = safeParseSchema(conversationsListResponseSchema, json)
    if (!parsed.success) {
        console.error(
            "Invalid /api/conversations payload:",
            parsed.error.flatten((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }))
        )
        throw new Error("Server response invalid.")
    }

    return {
        conversations: parsed.data.data.conversations,
        hasMore: parsed.data.data.pagination.hasMore,
    }
}

export function parseChatMessagePayload(payload: unknown, source: string): MessageData | null {
    const parsed = safeParseSchema(messageDataSchema, payload)
    if (parsed.success) return parsed.data

    console.error(
        `Invalid chat message payload from ${source}:`,
        parsed.error.flatten((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }))
    )
    return null
}

async function fetchChatJson<T>(
    url: string,
    fallbackMessage: string,
    schema: v.GenericSchema<unknown, T>,
    signal?: AbortSignal
): Promise<T> {
    const response = await fetch(url, {
        credentials: "include",
        signal,
    })
    const json = await readJsonResponse(response)

    if (!response.ok) {
        throw createApiError(response.status, json, fallbackMessage)
    }

    const parsed = safeParseSchema(schema, json)
    if (!parsed.success) {
        console.error(
            `Invalid chat API payload from ${url}:`,
            parsed.error.flatten((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }))
        )
        throw new Error("Server response invalid.")
    }

    return parsed.data
}

function getConversationsUrl({
    limit,
    offset,
    filter,
    typeFilter,
    sort,
    searchQuery,
}: {
    limit: number
    offset: number
    filter: ConversationFilterType
    typeFilter: ConversationTypeFilter
    sort: ConversationSort
    searchQuery: string
}): string {
    const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
    })

    if (filter === "unread") {
        params.set("unread", "true")
    }

    if (typeFilter !== "all") {
        params.set("type", typeFilter)
    }

    if (sort !== "newest") {
        params.set("sort", sort)
    }

    if (searchQuery) {
        params.set("search", searchQuery)
    }

    return `/api/conversations?${params}`
}
