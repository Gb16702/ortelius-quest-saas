import { useQueryClient } from "@tanstack/react-query"
import { parseChatMessagePayload } from "../../api/chat.api"
import {
    appendMessageToCachedFirstMessagePages,
    applyMessageDeleteToCachedFirstMessagePages,
    applyMessageEditToCachedFirstMessagePages,
} from "../../api/chat-message-page.cache"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import {
    useChatMessages,
    useMessageDeleted,
    useMessageEdited,
    useSystemMessage,
} from "./use-web-socket-message"

interface UseChatRealtimeEventsOptions {
    conversationId: string | undefined
    currentUserId: string | undefined
    scope: string
    allMessages: MessageData[]
    dispatch: (action: ChatAction) => void
    markCurrentConversationAsRead: () => void
}

export function useChatRealtimeEvents({
    conversationId,
    currentUserId,
    scope,
    allMessages,
    dispatch,
    markCurrentConversationAsRead,
}: UseChatRealtimeEventsOptions): void {
    const queryClient = useQueryClient()

    useChatMessages((wsMessage) => {
        if (
            wsMessage.conversationId !== conversationId ||
            wsMessage.data?.senderId === currentUserId
        ) {
            return
        }

        if (
            !wsMessage.data?.id ||
            allMessages.some((message) => message.id === wsMessage.data?.id)
        ) {
            return
        }

        const newMessage = parseChatMessagePayload(
            {
                ...wsMessage.data,
                content: wsMessage.data.content || "",
                createdAt: wsMessage.data.createdAt || new Date().toISOString(),
                updatedAt: wsMessage.data.updatedAt || new Date().toISOString(),
            },
            "message:new"
        )
        if (!newMessage) return

        dispatch({ type: "ADD_MESSAGE", message: newMessage })
        appendMessageToCachedFirstMessagePages(
            queryClient,
            {
                userId: currentUserId,
                scope,
                conversationId: wsMessage.conversationId,
            },
            newMessage
        )

        if (!document.hidden) {
            markCurrentConversationAsRead()
        }
    }, conversationId)

    useMessageEdited((wsMessage) => {
        if (wsMessage.conversationId !== conversationId || !wsMessage.data) return

        dispatch({
            type: "UPDATE_MESSAGE",
            messageId: wsMessage.data.id,
            updates: {
                content: wsMessage.data.content,
                isEdited: wsMessage.data.isEdited,
                updatedAt: wsMessage.data.updatedAt,
            },
        })
        applyMessageEditToCachedFirstMessagePages(
            queryClient,
            {
                userId: currentUserId,
                scope,
                conversationId: wsMessage.conversationId,
            },
            wsMessage
        )
    }, conversationId)

    useMessageDeleted((wsMessage) => {
        if (wsMessage.conversationId !== conversationId || !wsMessage.messageId) return

        dispatch({
            type: "DELETE_MESSAGE",
            messageId: wsMessage.messageId,
        })
        applyMessageDeleteToCachedFirstMessagePages(
            queryClient,
            {
                userId: currentUserId,
                scope,
                conversationId: wsMessage.conversationId,
            },
            wsMessage
        )
    }, conversationId)

    useSystemMessage((wsMessage) => {
        if (wsMessage.conversationId !== conversationId || !wsMessage.data) return
        if (!wsMessage.data.id || allMessages.some((message) => message.id === wsMessage.data.id)) {
            return
        }

        const systemMessage = parseChatMessagePayload(
            {
                id: wsMessage.data.id,
                content: wsMessage.data.content || "",
                messageType: "system",
                senderId: wsMessage.data.senderId,
                senderName: "",
                senderImage: null,
                organizationName: null,
                memberRole: null,
                metadata: wsMessage.data.metadata,
                replyTo: null,
                isEdited: false,
                isDeleted: false,
                createdAt: wsMessage.data.createdAt || new Date().toISOString(),
                updatedAt: wsMessage.data.updatedAt || new Date().toISOString(),
            },
            "system_message"
        )
        if (!systemMessage) return

        dispatch({ type: "ADD_MESSAGE", message: systemMessage })
        appendMessageToCachedFirstMessagePages(
            queryClient,
            {
                userId: currentUserId,
                scope,
                conversationId: wsMessage.conversationId,
            },
            systemMessage
        )
    }, conversationId)
}
