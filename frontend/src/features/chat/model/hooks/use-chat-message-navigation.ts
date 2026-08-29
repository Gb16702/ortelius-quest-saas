import type { Dispatch, RefObject } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import type { LoadOlderMessagesOptions, MessagePagination } from "../chat-page.context"
import { useChatMessageReplyNavigation } from "./use-chat-message-reply-navigation"
import { useChatMessageSearchNavigation } from "./use-chat-message-search-navigation"

interface UseChatMessageNavigationOptions {
    allMessages: MessageData[]
    dispatch: Dispatch<ChatAction>
    highlightedMessageRef: RefObject<HTMLElement | null>
    isSearchJumpingRef: RefObject<boolean>
    messageInputRef: RefObject<HTMLTextAreaElement | null>
    messagePaginationRef: RefObject<MessagePagination>
    oldestLoadedHistoryOffsetRef: RefObject<number>
    scrollToBottomRef: RefObject<(() => void) | null>
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
    loadOlderMessages: (options?: LoadOlderMessagesOptions) => Promise<boolean>
}

export function useChatMessageNavigation({
    allMessages,
    dispatch,
    highlightedMessageRef,
    isSearchJumpingRef,
    messageInputRef,
    messagePaginationRef,
    oldestLoadedHistoryOffsetRef,
    scrollToBottomRef,
    stickToBottomContextRef,
    loadOlderMessages,
}: UseChatMessageNavigationOptions) {
    const scrollToMessage = useChatMessageSearchNavigation({
        dispatch,
        isSearchJumpingRef,
        messagePaginationRef,
        oldestLoadedHistoryOffsetRef,
        stickToBottomContextRef,
        loadOlderMessages,
    })

    const { replyToMessage, cancelReply } = useChatMessageReplyNavigation({
        allMessages,
        dispatch,
        highlightedMessageRef,
        messageInputRef,
        scrollToBottomRef,
    })

    return {
        scrollToMessage,
        replyToMessage,
        cancelReply,
    }
}
