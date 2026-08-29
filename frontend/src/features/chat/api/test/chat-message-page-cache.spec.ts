import { describe, expect, it } from "bun:test"
import type { MessageDeletedMessage, MessageEditedMessage } from "@ortelius/websocket-types"
import { QueryClient } from "@tanstack/react-query"
import type { ChatMessagesPageResponse, MessageData } from "../../model/chat"
import { chatKeys } from "../chat.query-keys"
import {
    appendMessageToCachedFirstMessagePages,
    applyMessageDeleteToCachedFirstMessagePages,
    applyMessageEditToCachedFirstMessagePages,
} from "../chat-message-page.cache"

const scope = {
    userId: "user-1",
    scope: "/org/acme",
    conversationId: "conversation-1",
}

function buildMessage(id: string, content = id): MessageData {
    return {
        id,
        content,
        messageType: "text",
        senderId: "user-2",
        senderName: "Grace Hopper",
        senderImage: null,
        organizationName: null,
        memberRole: null,
        metadata: undefined,
        replyTo: null,
        isEdited: false,
        isDeleted: false,
        createdAt: "2026-05-13T12:00:00.000Z",
        updatedAt: "2026-05-13T12:00:00.000Z",
    }
}

function buildPage(
    messages: MessageData[],
    { limit = 2, offset = 0 }: { limit?: number; offset?: number } = {}
): ChatMessagesPageResponse {
    return {
        data: {
            messages,
            pagination: {
                total: messages.length,
                limit,
                offset,
                hasMore: false,
            },
        },
    }
}

function buildMessagesPageKey({
    conversationId = scope.conversationId,
    routeScope = scope.scope,
    offset = 0,
}: {
    conversationId?: string
    routeScope?: string
    offset?: number
} = {}) {
    return chatKeys.messagesPage({
        userId: scope.userId,
        scope: routeScope,
        conversationId,
        limit: 2,
        offset,
    })
}

describe("chat message page cache", () => {
    it("appends intent-prefetched messages only to the scoped first page", () => {
        const queryClient = new QueryClient()
        const firstPageKey = buildMessagesPageKey()
        const olderPageKey = buildMessagesPageKey({ offset: 2 })
        queryClient.setQueryData(
            firstPageKey,
            buildPage([buildMessage("old-1"), buildMessage("old-2")])
        )
        queryClient.setQueryData(olderPageKey, buildPage([buildMessage("older-1")], { offset: 2 }))

        const result = appendMessageToCachedFirstMessagePages(
            queryClient,
            scope,
            buildMessage("new-1", "Fresh")
        )

        expect(result).toEqual({ updatedCount: 1 })
        expect(
            queryClient
                .getQueryData<ChatMessagesPageResponse>(firstPageKey)
                ?.data.messages.map((message) => message.id)
        ).toEqual(["old-2", "new-1"])
        expect(
            queryClient.getQueryData<ChatMessagesPageResponse>(firstPageKey)?.data.pagination
        ).toMatchObject({
            total: 3,
            limit: 2,
            offset: 0,
            hasMore: true,
        })
        expect(
            queryClient
                .getQueryData<ChatMessagesPageResponse>(olderPageKey)
                ?.data.messages.map((message) => message.id)
        ).toEqual(["older-1"])
    })

    it("updates edited and deleted cached messages without crossing route scope", () => {
        const queryClient = new QueryClient()
        const targetKey = buildMessagesPageKey()
        const otherScopeKey = buildMessagesPageKey({ routeScope: "/org/other" })
        const reply = {
            ...buildMessage("reply-1", "Reply"),
            replyTo: {
                id: "message-1",
                senderId: "user-2",
                content: "Original",
                senderName: "Grace Hopper",
                senderImage: null,
                messageType: "text",
                createdAt: "2026-05-13T12:00:00.000Z",
                isDeleted: false,
            },
        }
        queryClient.setQueryData(
            targetKey,
            buildPage([buildMessage("message-1", "Original"), reply])
        )
        queryClient.setQueryData(otherScopeKey, buildPage([buildMessage("message-1", "Original")]))

        const editMessage: MessageEditedMessage = {
            type: "message:edited",
            timestamp: "2026-05-13T12:01:00.000Z",
            conversationId: scope.conversationId,
            data: {
                id: "message-1",
                content: "Edited",
                isEdited: true,
                updatedAt: "2026-05-13T12:01:00.000Z",
            },
        }
        applyMessageEditToCachedFirstMessagePages(queryClient, scope, editMessage)

        const deleteMessage: MessageDeletedMessage = {
            type: "message:deleted",
            timestamp: "2026-05-13T12:02:00.000Z",
            conversationId: scope.conversationId,
            messageId: "message-1",
        }
        applyMessageDeleteToCachedFirstMessagePages(queryClient, scope, deleteMessage)

        const targetMessages =
            queryClient.getQueryData<ChatMessagesPageResponse>(targetKey)?.data.messages ?? []
        const otherScopeMessages =
            queryClient.getQueryData<ChatMessagesPageResponse>(otherScopeKey)?.data.messages ?? []

        expect(targetMessages[0]).toMatchObject({
            id: "message-1",
            content: "Edited",
            isEdited: true,
            isDeleted: true,
        })
        expect(targetMessages[1]?.replyTo).toMatchObject({
            id: "message-1",
            content: "Edited",
            isDeleted: true,
        })
        expect(otherScopeMessages[0]).toMatchObject({
            id: "message-1",
            content: "Original",
            isDeleted: false,
        })
    })
})
