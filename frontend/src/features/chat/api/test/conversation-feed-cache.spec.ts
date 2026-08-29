import { describe, expect, it } from "bun:test"
import type { NewMessageMessage } from "@ortelius/websocket-types"
import { QueryClient } from "@tanstack/react-query"
import type { ChatConversationsResponse, Conversation } from "../../model/chat"
import { CONVERSATIONS_PAGE_LIMIT, chatKeys } from "../chat.query-keys"
import {
    applyConversationPinnedState,
    applyNewMessageToConversation,
    type ConversationsFeedData,
    updateCachedConversationFeeds,
    updateCachedInitialConversationPages,
} from "../conversation-feed.cache"

function buildConversation(id: string, updatedAt: string): Conversation {
    return {
        id,
        name: `Conversation ${id}`,
        lastMessage: {
            id: `${id}-message`,
            content: "Earlier message",
            senderId: "user-3",
            senderName: "Earlier Sender",
            createdAt: updatedAt,
            isUnread: false,
            metadata: undefined,
        },
        updatedAt,
        conversationType: "requester",
        isTeamChat: false,
    }
}

function buildFeedData(conversations: Conversation[]): ConversationsFeedData {
    return {
        pages: [{ conversations, hasMore: false }],
        pageParams: [0],
    }
}

function buildInitialConversationsPageData(
    conversations: Conversation[]
): ChatConversationsResponse {
    return {
        data: { conversations },
    }
}

function buildFeedKey({
    userId = "user-1",
    scope = "/profile",
    filter = "all",
    typeFilter = "all",
    sort = "newest",
    searchQuery = "",
}: {
    userId?: string
    scope?: string
    filter?: "all" | "unread"
    typeFilter?: "all" | "team" | "member_dm" | "requester"
    sort?: "newest" | "oldest"
    searchQuery?: string
} = {}) {
    return chatKeys.conversationsFeed({
        userId,
        scope,
        filter,
        typeFilter,
        sort,
        searchQuery,
        limit: CONVERSATIONS_PAGE_LIMIT,
    })
}

function buildInitialPageKey({
    userId = "user-1",
    scope = "/profile",
}: {
    userId?: string
    scope?: string
} = {}) {
    return chatKeys.initialConversationsPage({
        userId,
        scope,
        limit: CONVERSATIONS_PAGE_LIMIT,
        offset: 0,
    })
}

function buildNewMessage(conversationId: string): NewMessageMessage {
    return {
        type: "message:new",
        timestamp: "2026-05-11T10:00:00.000Z",
        conversationId,
        data: {
            id: "message-new",
            content: "Fresh websocket message",
            senderId: "user-2",
            senderName: "New Sender",
            createdAt: "2026-05-11T10:00:00.000Z",
            updatedAt: "2026-05-11T10:00:00.000Z",
            metadata: { source: "test" },
        },
    }
}

describe("conversation feed cache", () => {
    it("updates a fresh cached feed with websocket last-message data and ordering", () => {
        const queryClient = new QueryClient()
        const key = buildFeedKey()
        queryClient.setQueryData<ConversationsFeedData>(
            key,
            buildFeedData([
                buildConversation("conversation-old", "2026-05-11T08:00:00.000Z"),
                buildConversation("conversation-target", "2026-05-11T07:00:00.000Z"),
            ])
        )

        const result = updateCachedConversationFeeds(
            queryClient,
            { userId: "user-1", scope: "/profile" },
            (conversation) =>
                applyNewMessageToConversation(
                    conversation,
                    buildNewMessage("conversation-target"),
                    "user-1"
                ),
            { shouldSort: true, invalidateOnMiss: true }
        )

        expect(result).toEqual({ updatedCount: 1, invalidatedCount: 0 })

        const cachedFeed = queryClient.getQueryData<ConversationsFeedData>(key)
        const cachedConversations = cachedFeed?.pages.flatMap((page) => page.conversations) ?? []

        expect(cachedConversations.map((conversation) => conversation.id)).toEqual([
            "conversation-target",
            "conversation-old",
        ])
        expect(cachedConversations[0]?.lastMessage).toMatchObject({
            id: "message-new",
            content: "Fresh websocket message",
            isUnread: true,
        })

        const remountedFeed = queryClient.getQueryData<ConversationsFeedData>(key)
        expect(remountedFeed?.pages[0]?.conversations[0]?.lastMessage?.id).toBe("message-new")
    })

    it("invalidates cached feeds when a websocket conversation is outside loaded pages", () => {
        const queryClient = new QueryClient()
        const key = buildFeedKey({ filter: "unread" })
        queryClient.setQueryData<ConversationsFeedData>(
            key,
            buildFeedData([buildConversation("conversation-old", "2026-05-11T08:00:00.000Z")])
        )

        const result = updateCachedConversationFeeds(
            queryClient,
            { userId: "user-1", scope: "/profile" },
            (conversation) =>
                applyNewMessageToConversation(
                    conversation,
                    buildNewMessage("conversation-missing"),
                    "user-1"
                ),
            { shouldSort: true, invalidateOnMiss: true }
        )

        expect(result).toEqual({ updatedCount: 0, invalidatedCount: 1 })
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
    })

    it("invalidates cached list pages when a sent message misses loaded conversations", () => {
        const queryClient = new QueryClient()
        const feedKey = buildFeedKey()
        const initialPageKey = buildInitialPageKey()
        const cachedConversations = [
            buildConversation("conversation-old", "2026-05-11T08:00:00.000Z"),
        ]
        const feedScope = { userId: "user-1", scope: "/profile" }
        const applyMissingMessage = (conversation: Conversation) =>
            applyNewMessageToConversation(
                conversation,
                buildNewMessage("conversation-missing"),
                "user-1"
            )

        queryClient.setQueryData<ConversationsFeedData>(feedKey, buildFeedData(cachedConversations))
        queryClient.setQueryData<ChatConversationsResponse>(
            initialPageKey,
            buildInitialConversationsPageData(cachedConversations)
        )

        const feedResult = updateCachedConversationFeeds(
            queryClient,
            feedScope,
            applyMissingMessage,
            { shouldSort: true, invalidateOnMiss: true }
        )
        const initialPageResult = updateCachedInitialConversationPages(
            queryClient,
            feedScope,
            applyMissingMessage,
            { shouldSort: true, invalidateOnMiss: true }
        )

        expect(feedResult).toEqual({ updatedCount: 0, invalidatedCount: 1 })
        expect(initialPageResult).toEqual({ updatedCount: 0, invalidatedCount: 1 })
        expect(queryClient.getQueryState(feedKey)?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState(initialPageKey)?.isInvalidated).toBe(true)
    })

    it("leaves other user and scope feeds untouched", () => {
        const queryClient = new QueryClient()
        const targetKey = buildFeedKey()
        const otherScopeKey = buildFeedKey({ scope: "/org/acme" })
        const otherUserKey = buildFeedKey({ userId: "user-9" })
        const initialData = buildFeedData([
            buildConversation("conversation-target", "2026-05-11T07:00:00.000Z"),
        ])

        queryClient.setQueryData<ConversationsFeedData>(targetKey, initialData)
        queryClient.setQueryData<ConversationsFeedData>(otherScopeKey, initialData)
        queryClient.setQueryData<ConversationsFeedData>(otherUserKey, initialData)

        updateCachedConversationFeeds(
            queryClient,
            { userId: "user-1", scope: "/profile" },
            (conversation) =>
                applyNewMessageToConversation(
                    conversation,
                    buildNewMessage("conversation-target"),
                    "user-1"
                ),
            { shouldSort: true }
        )

        expect(
            queryClient.getQueryData<ConversationsFeedData>(targetKey)?.pages[0]?.conversations[0]
                ?.lastMessage?.id
        ).toBe("message-new")
        expect(
            queryClient.getQueryData<ConversationsFeedData>(otherScopeKey)?.pages[0]
                ?.conversations[0]?.lastMessage?.id
        ).toBe("conversation-target-message")
        expect(
            queryClient.getQueryData<ConversationsFeedData>(otherUserKey)?.pages[0]
                ?.conversations[0]?.lastMessage?.id
        ).toBe("conversation-target-message")
    })

    it("updates cached conversation pin state optimistically across feed and initial pages", () => {
        const queryClient = new QueryClient()
        const feedKey = buildFeedKey()
        const initialPageKey = buildInitialPageKey()
        const cachedConversations = [
            buildConversation("conversation-target", "2026-05-11T08:00:00.000Z"),
            buildConversation("conversation-other", "2026-05-11T07:00:00.000Z"),
        ]
        const applyPinState = (conversation: Conversation) =>
            applyConversationPinnedState(conversation, {
                conversationId: "conversation-target",
                isPinned: true,
                pinnedAt: "2026-05-22T08:10:26.000Z",
            })

        queryClient.setQueryData<ConversationsFeedData>(feedKey, buildFeedData(cachedConversations))
        queryClient.setQueryData<ChatConversationsResponse>(
            initialPageKey,
            buildInitialConversationsPageData(cachedConversations)
        )

        updateCachedConversationFeeds(
            queryClient,
            { userId: "user-1", scope: "/profile" },
            applyPinState
        )
        updateCachedInitialConversationPages(
            queryClient,
            { userId: "user-1", scope: "/profile" },
            applyPinState
        )

        expect(
            queryClient.getQueryData<ConversationsFeedData>(feedKey)?.pages[0]?.conversations[0]
        ).toMatchObject({
            id: "conversation-target",
            isPinned: true,
            pinnedAt: "2026-05-22T08:10:26.000Z",
        })
        expect(
            queryClient.getQueryData<ChatConversationsResponse>(initialPageKey)?.data
                .conversations[0]
        ).toMatchObject({
            id: "conversation-target",
            isPinned: true,
            pinnedAt: "2026-05-22T08:10:26.000Z",
        })
    })
})
