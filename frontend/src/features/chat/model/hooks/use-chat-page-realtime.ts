import { type Dispatch, useCallback } from "react"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import { useActiveChatConversation } from "./use-active-chat-conversation"
import { useChatRealtimeEvents } from "./use-chat-realtime-events"
import { useUnreadConversations } from "./use-unread-conversations"
import {
    type TypingUserInfo,
    useTypingIndicator,
    useTypingListener,
} from "./use-web-socket-message"

interface UseChatPageRealtimeOptions {
    conversationId: string | undefined
    userId: string | undefined
    userName: string | undefined
    scope: string
    allMessages: MessageData[]
    dispatch: Dispatch<ChatAction>
    markConversationAsRead: (conversationId: string) => Promise<void>
    canReadConversation: boolean
}

interface UseChatPageRealtimeResult {
    startTyping: () => void
    stopTyping: () => void
    typingUsers: TypingUserInfo[]
}

export function useChatPageRealtime({
    conversationId,
    userId,
    userName,
    scope,
    allMessages,
    dispatch,
    markConversationAsRead,
    canReadConversation,
}: UseChatPageRealtimeOptions): UseChatPageRealtimeResult {
    const { markConversationAsRead: markUnreadConversationAsRead } = useUnreadConversations()
    const { startTyping, stopTyping } = useTypingIndicator(conversationId || "", userName)
    const typingUsers = useTypingListener(conversationId || "")

    const applyConversationReadLocally = useCallback(
        (targetConversationId: string) => {
            dispatch({ type: "MARK_CONVERSATION_READ", conversationId: targetConversationId })
            markUnreadConversationAsRead(targetConversationId)
        },
        [dispatch, markUnreadConversationAsRead]
    )

    useActiveChatConversation({
        conversationId,
        userId,
        markConversationAsRead,
        onConversationRead: applyConversationReadLocally,
        canReadConversation,
    })

    const markCurrentConversationAsRead = useCallback(() => {
        if (!conversationId || !canReadConversation) return

        const targetConversationId = conversationId
        markConversationAsRead(targetConversationId).catch((error) => {
            console.error("Failed to mark message as read:", error)
        })
    }, [canReadConversation, conversationId, markConversationAsRead])

    useChatRealtimeEvents({
        conversationId: canReadConversation ? conversationId : undefined,
        currentUserId: userId,
        scope,
        allMessages,
        dispatch,
        markCurrentConversationAsRead,
    })

    return {
        startTyping,
        stopTyping,
        typingUsers,
    }
}
