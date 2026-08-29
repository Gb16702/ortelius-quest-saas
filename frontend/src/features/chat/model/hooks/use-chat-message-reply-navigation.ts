import { type Dispatch, type RefObject, useCallback } from "react"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import { findMessageElement } from "./chat-message-dom"

interface UseChatMessageReplyNavigationOptions {
    allMessages: MessageData[]
    dispatch: Dispatch<ChatAction>
    highlightedMessageRef: RefObject<HTMLElement | null>
    messageInputRef: RefObject<HTMLTextAreaElement | null>
    scrollToBottomRef: RefObject<(() => void) | null>
}

export function useChatMessageReplyNavigation({
    allMessages,
    dispatch,
    highlightedMessageRef,
    messageInputRef,
    scrollToBottomRef,
}: UseChatMessageReplyNavigationOptions) {
    const replyToMessage = useCallback(
        (messageId: string, content: string, senderName: string) => {
            if (highlightedMessageRef.current) {
                highlightedMessageRef.current.classList.remove("message-reply-highlight")
            }

            dispatch({
                type: "SET_REPLYING_TO",
                replyingTo: { messageId, content, senderName },
            })
            messageInputRef.current?.focus()

            const sortedMessages = [...allMessages].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            const lastMessage = sortedMessages[sortedMessages.length - 1]
            const isLastMessage = lastMessage?.id === messageId
            const messageElement = findMessageElement(messageId)

            if (messageElement) {
                if (isLastMessage && scrollToBottomRef.current) {
                    scrollToBottomRef.current()
                } else {
                    messageElement.scrollIntoView({
                        block: "center",
                    })
                }
                messageElement.classList.add("message-reply-highlight")
                highlightedMessageRef.current = messageElement
            }
        },
        [allMessages, dispatch, highlightedMessageRef, messageInputRef, scrollToBottomRef]
    )

    const cancelReply = useCallback(() => {
        if (highlightedMessageRef.current) {
            highlightedMessageRef.current.classList.remove("message-reply-highlight")
            highlightedMessageRef.current = null
        }
        dispatch({ type: "CLEAR_REPLYING_TO" })
    }, [dispatch, highlightedMessageRef])

    return {
        replyToMessage,
        cancelReply,
    }
}
