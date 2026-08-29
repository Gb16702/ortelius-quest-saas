import type { MessageDeletedMessage, MessageEditedMessage } from "@ortelius/websocket-types"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import type { NewMessageMessage } from "@/shared/api/websocket/web-socket"
import { parseChatMessagePayload } from "../../api/chat.api"
import {
    appendMessageToCachedFirstMessagePages,
    applyMessageDeleteToCachedFirstMessagePages,
    applyMessageEditToCachedFirstMessagePages,
} from "../../api/chat-message-page.cache"
import {
    applyMessageDeleteToConversation,
    applyMessageEditToConversation,
    applyNewMessageToConversation,
    applySystemMessageToConversation,
    updateCachedConversationFeeds,
    updateCachedInitialConversationPages,
} from "../../api/conversation-feed.cache"
import { useMessageListener } from "./use-message-broadcast"
import type { SystemMessage } from "./use-web-socket-message"
import {
    useChatMessages,
    useMessageDeleted,
    useMessageEdited,
    useSystemMessage,
} from "./use-web-socket-message"

interface UseChatsRealtimeEventsOptions {
    currentUserId?: string
    conversationScope: string
}

export function useChatsRealtimeEvents({
    currentUserId,
    conversationScope,
}: UseChatsRealtimeEventsOptions): void {
    const queryClient = useQueryClient()

    const updateConversation = useCallback(
        (message: NewMessageMessage) => {
            const feedScope = { userId: currentUserId, scope: conversationScope }
            updateCachedConversationFeeds(
                queryClient,
                feedScope,
                (conversation) =>
                    applyNewMessageToConversation(conversation, message, currentUserId),
                { shouldSort: true, invalidateOnMiss: true }
            )
            updateCachedInitialConversationPages(
                queryClient,
                feedScope,
                (conversation) =>
                    applyNewMessageToConversation(conversation, message, currentUserId),
                { shouldSort: true, invalidateOnMiss: true }
            )

            const newMessage = parseChatMessagePayload(
                {
                    ...message.data,
                    content: message.data.content || "",
                    createdAt: message.data.createdAt || new Date().toISOString(),
                    updatedAt: message.data.updatedAt || new Date().toISOString(),
                },
                "message:new"
            )

            if (newMessage) {
                appendMessageToCachedFirstMessagePages(
                    queryClient,
                    {
                        ...feedScope,
                        conversationId: message.conversationId,
                    },
                    newMessage
                )
            }
        },
        [conversationScope, currentUserId, queryClient]
    )

    const updateLastMessageContent = useCallback(
        (message: MessageEditedMessage) => {
            const feedScope = { userId: currentUserId, scope: conversationScope }
            updateCachedConversationFeeds(queryClient, feedScope, (conversation) =>
                applyMessageEditToConversation(conversation, message)
            )
            updateCachedInitialConversationPages(queryClient, feedScope, (conversation) =>
                applyMessageEditToConversation(conversation, message)
            )
            applyMessageEditToCachedFirstMessagePages(
                queryClient,
                {
                    ...feedScope,
                    conversationId: message.conversationId,
                },
                message
            )
        },
        [conversationScope, currentUserId, queryClient]
    )

    const markLastMessageAsDeleted = useCallback(
        (message: MessageDeletedMessage) => {
            const feedScope = { userId: currentUserId, scope: conversationScope }
            updateCachedConversationFeeds(queryClient, feedScope, (conversation) =>
                applyMessageDeleteToConversation(conversation, message)
            )
            updateCachedInitialConversationPages(queryClient, feedScope, (conversation) =>
                applyMessageDeleteToConversation(conversation, message)
            )
            applyMessageDeleteToCachedFirstMessagePages(
                queryClient,
                {
                    ...feedScope,
                    conversationId: message.conversationId,
                },
                message
            )
        },
        [conversationScope, currentUserId, queryClient]
    )

    const processSystemMessage = useCallback(
        (message: SystemMessage) => {
            const feedScope = { userId: currentUserId, scope: conversationScope }
            updateCachedConversationFeeds(
                queryClient,
                feedScope,
                (conversation) => applySystemMessageToConversation(conversation, message),
                { shouldSort: true, invalidateOnMiss: true }
            )
            updateCachedInitialConversationPages(
                queryClient,
                feedScope,
                (conversation) => applySystemMessageToConversation(conversation, message),
                { shouldSort: true, invalidateOnMiss: true }
            )

            const systemMessage = parseChatMessagePayload(
                {
                    id: message.data.id,
                    content: message.data.content || "",
                    messageType: "system",
                    senderId: message.data.senderId,
                    senderName: "",
                    senderImage: null,
                    organizationName: null,
                    memberRole: null,
                    metadata: message.data.metadata,
                    replyTo: null,
                    isEdited: false,
                    isDeleted: false,
                    createdAt: message.data.createdAt || new Date().toISOString(),
                    updatedAt: message.data.updatedAt || new Date().toISOString(),
                },
                "system_message"
            )

            if (systemMessage) {
                appendMessageToCachedFirstMessagePages(
                    queryClient,
                    {
                        ...feedScope,
                        conversationId: message.conversationId,
                    },
                    systemMessage
                )
            }
        },
        [conversationScope, currentUserId, queryClient]
    )

    useChatMessages(updateConversation)
    useMessageListener(updateConversation)
    useMessageEdited(updateLastMessageContent)
    useMessageDeleted(markLastMessageAsDeleted)
    useSystemMessage(processSystemMessage)
}
