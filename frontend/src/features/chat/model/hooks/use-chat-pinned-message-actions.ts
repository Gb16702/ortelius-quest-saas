import { type Dispatch, type RefObject, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import { usePinnedMessages } from "./use-pinned-messages"
import { useToggleMutationQueue } from "./use-toggle-mutation-queue"

interface UseChatPinnedMessageActionsOptions {
    conversationId: string | undefined
    canReadConversation: boolean
    allMessagesRef: RefObject<MessageData[]>
    dispatch: Dispatch<ChatAction>
}

export function useChatPinnedMessageActions({
    conversationId,
    canReadConversation,
    allMessagesRef,
    dispatch,
}: UseChatPinnedMessageActionsOptions) {
    const { t } = useTranslation("chat")
    const [isPinnedMenuOpen, setIsPinnedMenuOpen] = useState(false)
    const {
        pinnedMessages,
        setMessagePinnedState,
        removePinnedMessageFromCache,
        refreshPinnedMessages,
    } = usePinnedMessages(conversationId || "", { enabled: canReadConversation })

    const getCurrentPinnedValue = useCallback(
        (messageId: string) => {
            const messageIsPinned =
                allMessagesRef.current.find((message) => message.id === messageId)?.isPinned ??
                false
            return messageIsPinned || pinnedMessages.some((message) => message.id === messageId)
        },
        [allMessagesRef, pinnedMessages]
    )

    const applyPinnedMessageState = useCallback(
        (messageId: string, isPinned: boolean) => {
            dispatch({
                type: "UPDATE_MESSAGE",
                messageId,
                updates: { isPinned },
            })

            if (!isPinned) {
                removePinnedMessageFromCache(messageId)
            }
        },
        [dispatch, removePinnedMessageFromCache]
    )

    const queuePinnedMessageToggle = useToggleMutationQueue({
        mutate: ({ id: messageId, nextValue }) => setMessagePinnedState(messageId, nextValue),
        onOptimisticChange: ({ id: messageId, nextValue }) => {
            applyPinnedMessageState(messageId, nextValue)
        },
        onSuccess: ({ nextValue }) => {
            showSuccessToast(nextValue ? t("toast.messagePinned") : t("toast.messageUnpinned"))
            void refreshPinnedMessages()
        },
        onError: ({ nextValue, error, retry }) => {
            void refreshPinnedMessages()
            showRetryErrorToast(
                error instanceof Error
                    ? error.message
                    : nextValue
                      ? t("toast.pinMessageFailed")
                      : t("toast.unpinMessageFailed"),
                { onRetry: () => void retry() }
            )
        },
    })

    const pinMessage = useCallback(
        (messageId: string) =>
            queuePinnedMessageToggle(messageId, true, getCurrentPinnedValue(messageId)),
        [getCurrentPinnedValue, queuePinnedMessageToggle]
    )

    const unpinMessage = useCallback(
        (messageId: string) =>
            queuePinnedMessageToggle(messageId, false, getCurrentPinnedValue(messageId)),
        [getCurrentPinnedValue, queuePinnedMessageToggle]
    )

    const openPinnedMessagesMenu = useCallback(() => {
        setIsPinnedMenuOpen(true)
    }, [])

    return {
        pinnedMessages,
        isPinnedMenuOpen,
        setIsPinnedMenuOpen,
        pinMessage,
        unpinMessage,
        openPinnedMessagesMenu,
    }
}
