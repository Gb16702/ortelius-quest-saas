import type {
    MessageDeletedMessage,
    MessageEditedMessage,
    NewMessageMessage,
} from "@ortelius/websocket-types"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import type { ChatConversationsResponse, Conversation } from "../model/chat"
import type { ConversationSort } from "../model/conversation-sort"
import { isTeamConversationType } from "../model/conversation-type"
import type { ConversationsPageResult } from "./chat.api"
import { chatKeys } from "./chat.query-keys"

export type ConversationsFeedData = InfiniteData<ConversationsPageResult, number>

interface ConversationFeedScope {
    userId: string | undefined
    scope: string
}

interface UpdateCachedConversationFeedsOptions {
    shouldSort?: boolean
    invalidateOnMiss?: boolean
}

interface UpdateConversationFeedDataOptions {
    shouldSort?: boolean
    sort?: ConversationSort
}

interface CachedConversationFeedsUpdateResult {
    updatedCount: number
    invalidatedCount: number
}

interface ApplyConversationPinnedStateOptions {
    conversationId: string
    isPinned: boolean
    pinnedAt: string
}

type ConversationUpdater = (conversation: Conversation) => Conversation

interface ConversationSystemMessage {
    type: "system_message"
    conversationId: string
    timestamp: string
    data: {
        id: string
        content: string
        senderId: string
        metadata?: Record<string, unknown>
        createdAt: string
        updatedAt: string
    }
}

export function updateCachedConversationFeeds(
    queryClient: QueryClient,
    scope: ConversationFeedScope,
    updateConversation: ConversationUpdater,
    options: UpdateCachedConversationFeedsOptions = {}
): CachedConversationFeedsUpdateResult {
    if (!scope.userId) {
        return { updatedCount: 0, invalidatedCount: 0 }
    }

    const queryKey = chatKeys.conversationsFeedScope({
        userId: scope.userId,
        scope: scope.scope,
    })
    const queries = queryClient.getQueryCache().findAll({ queryKey })
    let updatedCount = 0
    let invalidatedCount = 0

    for (const query of queries) {
        const data = queryClient.getQueryData<ConversationsFeedData>(query.queryKey)
        const nextData = updateConversationsFeedData(data, updateConversation, {
            shouldSort: options.shouldSort,
            sort: getConversationFeedSort(query.queryKey),
        })

        if (nextData !== data) {
            queryClient.setQueryData(query.queryKey, nextData)
            updatedCount += 1
            continue
        }

        if (options.invalidateOnMiss) {
            void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
            invalidatedCount += 1
        }
    }

    if (queries.length === 0 && options.invalidateOnMiss) {
        void queryClient.invalidateQueries({ queryKey })
        invalidatedCount += 1
    }

    return { updatedCount, invalidatedCount }
}

export function updateCachedInitialConversationPages(
    queryClient: QueryClient,
    scope: ConversationFeedScope,
    updateConversation: ConversationUpdater,
    options: UpdateCachedConversationFeedsOptions = {}
): CachedConversationFeedsUpdateResult {
    if (!scope.userId) {
        return { updatedCount: 0, invalidatedCount: 0 }
    }

    const queryKey = chatKeys.initialConversationsPageScope({
        userId: scope.userId,
        scope: scope.scope,
    })
    const queries = queryClient.getQueryCache().findAll({ queryKey })
    let updatedCount = 0
    let invalidatedCount = 0

    for (const query of queries) {
        const data = queryClient.getQueryData<ChatConversationsResponse>(query.queryKey)
        const nextData = updateInitialConversationsPage(data, updateConversation, {
            shouldSort: options.shouldSort,
        })

        if (nextData !== data) {
            queryClient.setQueryData(query.queryKey, nextData)
            updatedCount += 1
            continue
        }

        if (options.invalidateOnMiss) {
            void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
            invalidatedCount += 1
        }
    }

    if (queries.length === 0 && options.invalidateOnMiss) {
        void queryClient.invalidateQueries({ queryKey })
        invalidatedCount += 1
    }

    return { updatedCount, invalidatedCount }
}

export function updateConversationsFeedData(
    data: ConversationsFeedData | undefined,
    updateConversation: ConversationUpdater,
    options: UpdateConversationFeedDataOptions = {}
): ConversationsFeedData | undefined {
    if (!data) return data

    const conversations = data.pages.flatMap((page) => page.conversations)
    let didUpdate = false

    const updatedConversations = conversations.map((conversation) => {
        const updatedConversation = updateConversation(conversation)
        if (updatedConversation !== conversation) {
            didUpdate = true
        }
        return updatedConversation
    })

    if (!didUpdate) return data

    const nextConversations = options.shouldSort
        ? sortConversationsByUpdatedAt(updatedConversations, options.sort ?? "newest")
        : updatedConversations

    return {
        ...data,
        pages: distributeConversationsAcrossPages(data.pages, nextConversations),
    }
}

function updateInitialConversationsPage(
    data: ChatConversationsResponse | undefined,
    updateConversation: ConversationUpdater,
    options: Pick<UpdateCachedConversationFeedsOptions, "shouldSort"> = {}
): ChatConversationsResponse | undefined {
    if (!data) return data

    let didUpdate = false
    const updatedConversations = data.data.conversations.map((conversation) => {
        const updatedConversation = updateConversation(conversation)
        if (updatedConversation !== conversation) {
            didUpdate = true
        }
        return updatedConversation
    })

    if (!didUpdate) return data

    return {
        ...data,
        data: {
            ...data.data,
            conversations: options.shouldSort
                ? sortConversationsByUpdatedAt(updatedConversations, "newest")
                : updatedConversations,
        },
    }
}

export function applyNewMessageToConversation(
    conversation: Conversation,
    message: NewMessageMessage,
    currentUserId: string | undefined
): Conversation {
    if (conversation.id !== message.conversationId) return conversation

    const isFromCurrentUser = message.data.senderId === currentUserId
    return {
        ...conversation,
        lastMessage: {
            id: message.data.id,
            content: message.data.content,
            messageType: message.data.messageType || "text",
            senderId: message.data.senderId,
            senderName: message.data.senderName,
            createdAt: message.data.createdAt,
            isUnread: !isFromCurrentUser,
            metadata: message.data.metadata,
        },
        updatedAt: message.data.updatedAt || new Date().toISOString(),
    }
}

export function applyMessageEditToConversation(
    conversation: Conversation,
    message: MessageEditedMessage
): Conversation {
    if (
        conversation.id !== message.conversationId ||
        conversation.lastMessage?.id !== message.data?.id
    ) {
        return conversation
    }

    return {
        ...conversation,
        lastMessage: {
            ...conversation.lastMessage,
            content: message.data.content,
        },
    }
}

export function applyMessageDeleteToConversation(
    conversation: Conversation,
    message: MessageDeletedMessage
): Conversation {
    if (
        conversation.id !== message.conversationId ||
        conversation.lastMessage?.id !== message.messageId
    ) {
        return conversation
    }

    return {
        ...conversation,
        lastMessage: conversation.lastMessage
            ? {
                  ...conversation.lastMessage,
                  content: "This message was deleted",
                  messageType: "deleted",
              }
            : null,
    }
}

export function applySystemMessageToConversation(
    conversation: Conversation,
    message: ConversationSystemMessage
): Conversation {
    if (conversation.id !== message.conversationId) return conversation

    return {
        ...conversation,
        lastMessage: {
            id: message.data.id,
            content: message.data.content,
            messageType: "system",
            senderId: message.data.senderId,
            senderName: "",
            createdAt: message.data.createdAt || new Date().toISOString(),
            isUnread: false,
            metadata: message.data.metadata,
        },
        updatedAt: message.timestamp || new Date().toISOString(),
    }
}

export function applyConversationPinnedState(
    conversation: Conversation,
    { conversationId, isPinned, pinnedAt }: ApplyConversationPinnedStateOptions
): Conversation {
    if (conversation.id !== conversationId) return conversation

    return {
        ...conversation,
        isPinned,
        pinnedAt: isPinned ? (conversation.pinnedAt ?? pinnedAt) : null,
    }
}

function distributeConversationsAcrossPages(
    pages: ConversationsPageResult[],
    conversations: Conversation[]
): ConversationsPageResult[] {
    let cursor = 0
    return pages.map((page) => {
        const pageSize = page.conversations.length
        const nextPage = {
            ...page,
            conversations: conversations.slice(cursor, cursor + pageSize),
        }
        cursor += pageSize
        return nextPage
    })
}

function sortConversationsByUpdatedAt(
    conversations: Conversation[],
    sort: ConversationSort
): Conversation[] {
    return [...conversations].sort((a, b) => {
        if (
            isTeamConversationType(a.conversationType) &&
            !isTeamConversationType(b.conversationType)
        ) {
            return -1
        }
        if (
            !isTeamConversationType(a.conversationType) &&
            isTeamConversationType(b.conversationType)
        ) {
            return 1
        }

        const aTime = new Date(a.updatedAt).getTime()
        const bTime = new Date(b.updatedAt).getTime()
        return sort === "newest" ? bTime - aTime : aTime - bTime
    })
}

function getConversationFeedSort(queryKey: readonly unknown[]): ConversationSort {
    return queryKey.at(-3) === "oldest" ? "oldest" : "newest"
}
