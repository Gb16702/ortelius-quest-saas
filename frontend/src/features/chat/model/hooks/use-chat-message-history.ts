import type { Dispatch, RefObject } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"
import type { InitialChatPageData } from "../../api/chat.api"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import type { ChatConversationLoadState } from "../chat-conversation-access"
import type { LoadOlderMessagesOptions, MessagePagination } from "../chat-page.context"
import { useChatInitialPageData } from "./use-chat-initial-page-data"
import { useChatOlderMessages } from "./use-chat-older-messages"

interface UseChatMessageHistoryOptions {
    conversationId: string | undefined
    userId: string | undefined
    basePath: string
    initialPageData: InitialChatPageData | null
    allMessages: MessageData[]
    dispatch: Dispatch<ChatAction>
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
}

interface UseChatMessageHistoryResult {
    messagePagination: MessagePagination
    messagePaginationRef: RefObject<MessagePagination>
    allMessagesRef: RefObject<MessageData[]>
    oldestLoadedHistoryOffsetRef: RefObject<number>
    isSearchJumpingRef: RefObject<boolean>
    isLoadingOlderMessages: boolean
    loadOlderMessages: (options?: LoadOlderMessagesOptions) => Promise<boolean>
    conversationLoadState: ChatConversationLoadState
    retryInitialLoad: () => void
}

export function useChatMessageHistory({
    conversationId,
    userId,
    basePath,
    initialPageData,
    allMessages,
    dispatch,
    stickToBottomContextRef,
}: UseChatMessageHistoryOptions): UseChatMessageHistoryResult {
    const {
        messagePagination,
        messagePaginationRef,
        allMessagesRef,
        oldestLoadedHistoryOffsetRef,
        isSearchJumpingRef,
        isLoadingOlderMessages,
        loadOlderMessages,
        setInitialMessagePage,
    } = useChatOlderMessages({
        conversationId,
        initialMessagePage: initialPageData
            ? {
                  messages: initialPageData.messagesPage.data.messages,
                  pagination: initialPageData.messagesPage.data.pagination,
              }
            : null,
        allMessages,
        dispatch,
        stickToBottomContextRef,
    })

    const { conversationLoadState, retryInitialLoad } = useChatInitialPageData({
        conversationId,
        userId,
        basePath,
        initialPageData,
        dispatch,
        setInitialMessagePage,
    })

    return {
        messagePagination,
        messagePaginationRef,
        allMessagesRef,
        oldestLoadedHistoryOffsetRef,
        isSearchJumpingRef,
        isLoadingOlderMessages,
        loadOlderMessages,
        conversationLoadState,
        retryInitialLoad,
    }
}
