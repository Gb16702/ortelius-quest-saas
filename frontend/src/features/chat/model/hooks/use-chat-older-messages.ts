import {
    type Dispatch,
    type RefObject,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import type { StickToBottomContext } from "use-stick-to-bottom"
import { showErrorToast } from "@/shared/ui/toasts"
import { fetchChatMessagesPage, MESSAGE_PAGE_LIMIT } from "../../api/chat.api"
import type { ChatMessagesPageResponse, MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import {
    EMPTY_MESSAGE_PAGINATION,
    type LoadOlderMessagesOptions,
    type MessagePagination,
} from "../chat-page.context"

interface InitialMessagePage {
    messages: MessageData[]
    pagination: ChatMessagesPageResponse["data"]["pagination"]
}

interface UseChatOlderMessagesOptions {
    conversationId: string | undefined
    initialMessagePage: InitialMessagePage | null
    allMessages: MessageData[]
    dispatch: Dispatch<ChatAction>
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
}

export function useChatOlderMessages({
    conversationId,
    initialMessagePage,
    allMessages,
    dispatch,
    stickToBottomContextRef,
}: UseChatOlderMessagesOptions) {
    const { t } = useTranslation("chat")
    const [messagePagination, setMessagePagination] = useState<MessagePagination>(() =>
        initialMessagePage ? getMessagePagination(initialMessagePage) : EMPTY_MESSAGE_PAGINATION
    )
    const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
    const messagePaginationRef = useRef<MessagePagination>(messagePagination)
    messagePaginationRef.current = messagePagination
    const oldestLoadedHistoryOffsetRef = useRef(
        initialMessagePage?.messages.length ? initialMessagePage.messages.length - 1 : -1
    )
    const allMessagesRef = useRef<MessageData[]>(allMessages)
    allMessagesRef.current = allMessages
    const isLoadingOlderMessagesRef = useRef(false)
    const isSearchJumpingRef = useRef(false)
    const olderMessagesScrollRestoreRef = useRef<{
        scrollHeight: number
        scrollTop: number
    } | null>(null)

    const setInitialMessagePage = useCallback(({ messages, pagination }: InitialMessagePage) => {
        oldestLoadedHistoryOffsetRef.current = messages.length > 0 ? messages.length - 1 : -1
        setMessagePagination(getMessagePagination({ messages, pagination }))
    }, [])

    useLayoutEffect(() => {
        const restore = olderMessagesScrollRestoreRef.current
        const scrollElement = stickToBottomContextRef.current?.scrollRef.current
        if (!restore || !scrollElement) return

        olderMessagesScrollRestoreRef.current = null
        scrollElement.scrollTop =
            scrollElement.scrollHeight - restore.scrollHeight + restore.scrollTop
    })

    const loadOlderMessages = useCallback(
        async (options?: LoadOlderMessagesOptions) => {
            const preserveScroll = options?.preserveScroll ?? true
            const currentPagination = messagePaginationRef.current
            if (
                !conversationId ||
                isLoadingOlderMessagesRef.current ||
                !currentPagination.hasMore ||
                (isSearchJumpingRef.current && !options?.allowDuringSearchJump)
            )
                return false

            const scrollElement = stickToBottomContextRef.current?.scrollRef.current
            const scrollSnapshot =
                preserveScroll && scrollElement
                    ? {
                          scrollHeight: scrollElement.scrollHeight,
                          scrollTop: scrollElement.scrollTop,
                      }
                    : null

            isLoadingOlderMessagesRef.current = true
            setIsLoadingOlderMessages(true)
            try {
                const currentMessages = allMessagesRef.current
                const pageOffset = oldestLoadedHistoryOffsetRef.current + 1
                const parsed = await fetchChatMessagesPage({
                    conversationId,
                    offset: pageOffset,
                })

                const messages = parsed.data.messages
                const pagination = parsed.data.pagination
                const existingMessageIds = new Set(currentMessages.map((message) => message.id))
                const hasNewMessages = messages.some(
                    (message) => !existingMessageIds.has(message.id)
                )

                if (hasNewMessages && scrollSnapshot) {
                    olderMessagesScrollRestoreRef.current = scrollSnapshot
                } else {
                    olderMessagesScrollRestoreRef.current = null
                }

                dispatch({ type: "MERGE_MESSAGES", messages })
                if (messages.length > 0) {
                    oldestLoadedHistoryOffsetRef.current = Math.max(
                        oldestLoadedHistoryOffsetRef.current,
                        pageOffset + messages.length - 1
                    )
                }
                const nextPagination = {
                    total: Number(pagination?.total ?? currentPagination.total),
                    limit: Number(pagination?.limit ?? MESSAGE_PAGE_LIMIT),
                    offset: Number(pagination?.offset ?? pageOffset),
                    hasMore: Boolean(pagination?.hasMore ?? false),
                }
                messagePaginationRef.current = nextPagination
                setMessagePagination(nextPagination)
                return messages.length > 0
            } catch (error) {
                console.error("Failed to load earlier messages:", error)
                showErrorToast(t("toast.loadEarlierFailed"))
                return false
            } finally {
                isLoadingOlderMessagesRef.current = false
                setIsLoadingOlderMessages(false)
            }
        },
        [conversationId, dispatch, stickToBottomContextRef, t]
    )

    return {
        messagePagination,
        messagePaginationRef,
        allMessagesRef,
        oldestLoadedHistoryOffsetRef,
        isSearchJumpingRef,
        isLoadingOlderMessages,
        loadOlderMessages,
        setInitialMessagePage,
    }
}

function getMessagePagination({ messages, pagination }: InitialMessagePage): MessagePagination {
    return {
        total: Number(pagination?.total ?? messages.length),
        limit: Number(pagination?.limit ?? MESSAGE_PAGE_LIMIT),
        offset: Number(pagination?.offset ?? 0),
        hasMore: Boolean(pagination?.hasMore ?? false),
    }
}
