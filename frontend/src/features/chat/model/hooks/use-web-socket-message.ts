import type {
    MessageDeletedMessage,
    MessageEditedMessage,
    TypingMessage,
} from "@ortelius/websocket-types"
import { useCallback, useEffect, useRef, useState } from "react"
import type {
    BaseWebSocketMessage,
    NewMessageMessage,
    WebSocketMessage,
} from "@/shared/api/websocket/web-socket"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import {
    createTypingUserExpiryScheduler,
    removeTypingUser,
    setTypingUser,
    type TypingUserExpiryScheduler,
    type TypingUserInfo,
} from "../typing-indicator"

export type { TypingUserInfo } from "../typing-indicator"

export function useWebSocketMessage<T extends WebSocketMessage = WebSocketMessage>(
    messageType?: string | string[],
    onMessage?: (message: T) => void
) {
    const { subscribe, lastMessage } = useWebSocket()
    const onMessageRef = useRef(onMessage)

    useEffect(() => {
        onMessageRef.current = onMessage
    }, [onMessage])

    const matchesType = useCallback(
        (message: WebSocketMessage): message is T => {
            if (!messageType) return true

            const types = Array.isArray(messageType) ? messageType : [messageType]
            return types.includes(message.type)
        },
        [messageType]
    )

    useEffect(() => {
        return subscribe((message) => {
            if (matchesType(message) && onMessageRef.current) {
                onMessageRef.current(message)
            }
        })
    }, [subscribe, matchesType])

    return lastMessage && matchesType(lastMessage) ? lastMessage : null
}

export function useChatMessages(
    onNewMessage?: (message: NewMessageMessage) => void,
    conversationId?: string
) {
    return useWebSocketMessage<NewMessageMessage>("message:new", (message) => {
        if (conversationId && message.conversationId !== conversationId) {
            return
        }
        onNewMessage?.(message)
    })
}

export function useTypingIndicator(conversationId: string, _userName?: string) {
    const { sendMessage } = useWebSocket()

    const sendTyping = useCallback(
        (isTyping: boolean) => {
            sendMessage({
                type: "chat:typing",
                conversationId,
                isTyping,
                timestamp: new Date().toISOString(),
            })
        },
        [sendMessage, conversationId]
    )

    const startTyping = useCallback(() => sendTyping(true), [sendTyping])
    const stopTyping = useCallback(() => sendTyping(false), [sendTyping])

    return { startTyping, stopTyping }
}

type TypingWebSocketMessage = TypingMessage & {
    userId: string
    userName?: string
    userImage?: string | null
}

export function useTypingListener(conversationId: string) {
    const [typingUsers, setTypingUsers] = useState<Map<string, TypingUserInfo>>(new Map())
    const typingExpirySchedulerRef = useRef<TypingUserExpiryScheduler | null>(null)
    const conversationIdRef = useRef(conversationId)

    if (!typingExpirySchedulerRef.current) {
        typingExpirySchedulerRef.current = createTypingUserExpiryScheduler({
            setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
            clearTimeout: (timerId) => globalThis.clearTimeout(timerId),
        })
    }

    const typingExpiryScheduler = typingExpirySchedulerRef.current

    useEffect(() => {
        return () => typingExpiryScheduler.clearAll()
    }, [typingExpiryScheduler])

    useEffect(() => {
        if (conversationIdRef.current === conversationId) {
            return
        }

        conversationIdRef.current = conversationId
        typingExpiryScheduler.clearAll()
        setTypingUsers(new Map())
    }, [conversationId, typingExpiryScheduler])

    useWebSocketMessage<TypingWebSocketMessage>("chat:typing", (message) => {
        if (message.conversationId !== conversationId) return

        setTypingUsers((prev) => {
            if (message.isTyping) {
                typingExpiryScheduler.refresh(message.userId, () => {
                    setTypingUsers((currentUsers) => removeTypingUser(currentUsers, message.userId))
                })

                return setTypingUser(prev, {
                    userId: message.userId,
                    userName: message.userName,
                    userImage: message.userImage,
                })
            }

            typingExpiryScheduler.clear(message.userId)
            return removeTypingUser(prev, message.userId)
        })
    })

    return Array.from(typingUsers.values())
}

export function useMessageEdited(
    onMessageEdited?: (message: MessageEditedMessage) => void,
    conversationId?: string
) {
    return useWebSocketMessage<MessageEditedMessage>("message:edited", (message) => {
        if (conversationId && message.conversationId !== conversationId) {
            return
        }
        onMessageEdited?.(message)
    })
}

export function useMessageDeleted(
    onMessageDeleted?: (message: MessageDeletedMessage) => void,
    conversationId?: string
) {
    return useWebSocketMessage<MessageDeletedMessage>("message:deleted", (message) => {
        if (conversationId && message.conversationId !== conversationId) {
            return
        }
        onMessageDeleted?.(message)
    })
}

export type SystemMessage = BaseWebSocketMessage & {
    type: "system_message"
    conversationId: string
    data: {
        id: string
        content: string
        senderId: string
        metadata?: Record<string, unknown>
        createdAt: string
        updatedAt: string
    }
}

export function useSystemMessage(
    onSystemMessage?: (message: SystemMessage) => void,
    conversationId?: string
) {
    return useWebSocketMessage<SystemMessage>("system_message", (message) => {
        if (conversationId && message.conversationId !== conversationId) {
            return
        }
        onSystemMessage?.(message)
    })
}
