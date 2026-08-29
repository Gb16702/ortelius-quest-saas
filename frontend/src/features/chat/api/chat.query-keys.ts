import type { ConversationSort } from "../model/conversation-sort"
import type { ConversationTypeFilter } from "../model/conversation-type"

export const CONVERSATIONS_PAGE_LIMIT = 10
export const MESSAGE_PAGE_LIMIT = 100

export type ConversationFilterType = "all" | "unread"

interface ChatMessagesPageKeyInput {
    userId: string
    scope: string
    conversationId: string
    limit: number
    offset: number
}

interface ChatConversationsPageKeyInput {
    userId: string
    scope: string
    limit: number
    offset: number
}

interface ChatConversationsFeedScopeKeyInput {
    userId: string
    scope: string
}

interface ChatConversationsFeedKeyInput extends ChatConversationsFeedScopeKeyInput {
    filter: ConversationFilterType
    typeFilter: ConversationTypeFilter
    sort: ConversationSort
    searchQuery: string
    limit: number
}

interface ChatConversationScopedKeyInput {
    conversationId: string
    limit?: number
    offset?: number
}

export const chatKeys = {
    all: ["chat"] as const,
    messagesPages: () => [...chatKeys.all, "messages-page"] as const,
    messagesPageConversation: ({
        userId,
        scope,
        conversationId,
    }: Omit<ChatMessagesPageKeyInput, "limit" | "offset">) =>
        [...chatKeys.messagesPages(), userId, scope, conversationId] as const,
    messagesPage: ({ userId, scope, conversationId, limit, offset }: ChatMessagesPageKeyInput) =>
        [
            ...chatKeys.messagesPageConversation({ userId, scope, conversationId }),
            limit,
            offset,
        ] as const,
    initialConversationsPages: () => [...chatKeys.all, "initial-conversations-page"] as const,
    initialConversationsPageScope: ({ userId, scope }: ChatConversationsFeedScopeKeyInput) =>
        [...chatKeys.initialConversationsPages(), userId, scope] as const,
    initialConversationsPage: ({ userId, scope, limit, offset }: ChatConversationsPageKeyInput) =>
        [...chatKeys.initialConversationsPageScope({ userId, scope }), limit, offset] as const,
    conversationsFeeds: () => [...chatKeys.all, "conversations-feed"] as const,
    conversationsFeedScope: ({ userId, scope }: ChatConversationsFeedScopeKeyInput) =>
        [...chatKeys.conversationsFeeds(), userId, scope] as const,
    conversationsFeed: ({
        userId,
        scope,
        filter,
        typeFilter,
        sort,
        searchQuery,
        limit,
    }: ChatConversationsFeedKeyInput) =>
        [
            ...chatKeys.conversationsFeedScope({ userId, scope }),
            filter,
            typeFilter,
            sort,
            searchQuery,
            limit,
        ] as const,
    // Conversation ids are treated as globally unique API identifiers. If the API
    // ever switches to tenant-local ids or user-specific payloads, add that scope here.
    pinnedMessages: (conversationId: string) =>
        [...chatKeys.all, "pinned-messages", conversationId] as const,
    readStatus: ({ conversationId, limit, offset }: ChatConversationScopedKeyInput) =>
        [...chatKeys.all, "read-status", conversationId, limit ?? null, offset ?? null] as const,
}
