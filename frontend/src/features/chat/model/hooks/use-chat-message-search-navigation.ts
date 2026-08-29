import { type Dispatch, type RefObject, useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { StickToBottomContext } from "use-stick-to-bottom"
import { showErrorToast } from "@/shared/ui/toasts"
import type { MessageData } from "../chat"
import type { ChatAction } from "../chat.reducer"
import type { LoadOlderMessagesOptions, MessagePagination } from "../chat-page.context"
import {
    findMessageElement,
    highlightMessageElement,
    waitForMessageElement,
} from "./chat-message-dom"

interface UseChatMessageSearchNavigationOptions {
    dispatch: Dispatch<ChatAction>
    isSearchJumpingRef: RefObject<boolean>
    messagePaginationRef: RefObject<MessagePagination>
    oldestLoadedHistoryOffsetRef: RefObject<number>
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
    loadOlderMessages: (options?: LoadOlderMessagesOptions) => Promise<boolean>
}

export function useChatMessageSearchNavigation({
    dispatch,
    isSearchJumpingRef,
    messagePaginationRef,
    oldestLoadedHistoryOffsetRef,
    stickToBottomContextRef,
    loadOlderMessages,
}: UseChatMessageSearchNavigationOptions) {
    const { t } = useTranslation("chat")

    const mergeSearchResultSnapshot = useCallback(
        (messageSnapshot: MessageData) => {
            isSearchJumpingRef.current = true
            dispatch({ type: "MERGE_MESSAGES", messages: [messageSnapshot] })

            if (typeof messageSnapshot.historyOffset !== "number") return false

            const previousOldestHistoryOffset = oldestLoadedHistoryOffsetRef.current
            oldestLoadedHistoryOffsetRef.current = Math.max(
                previousOldestHistoryOffset,
                messageSnapshot.historyOffset
            )

            return messageSnapshot.historyOffset >= previousOldestHistoryOffset
        },
        [dispatch, isSearchJumpingRef, oldestLoadedHistoryOffsetRef]
    )

    const loadUntilMessageVisible = useCallback(
        async (messageId: string) => {
            let messageElement: HTMLElement | null = null

            for (
                let loadedPages = 0;
                !messageElement && messagePaginationRef.current.hasMore && loadedPages < 50;
                loadedPages += 1
            ) {
                const loadedMessages = await loadOlderMessages({
                    preserveScroll: false,
                    allowDuringSearchJump: true,
                })

                messageElement = await waitForMessageElement(messageId)
                if (!loadedMessages && !messagePaginationRef.current.hasMore) break
                if (!loadedMessages && !messageElement) break
            }

            return messageElement
        },
        [loadOlderMessages, messagePaginationRef]
    )

    const releaseSearchJumpAfterFrame = useCallback(() => {
        const releaseSearchJump = () => {
            isSearchJumpingRef.current = false
        }

        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(releaseSearchJump)
            return
        }

        globalThis.setTimeout(releaseSearchJump, 0)
    }, [isSearchJumpingRef])

    const primeSearchContextAndRelease = useCallback(
        (shouldPrimeSearchContext: boolean) => {
            if (shouldPrimeSearchContext && messagePaginationRef.current.hasMore) {
                void loadOlderMessages({
                    preserveScroll: true,
                    allowDuringSearchJump: true,
                }).finally(releaseSearchJumpAfterFrame)
                return
            }

            releaseSearchJumpAfterFrame()
        },
        [loadOlderMessages, messagePaginationRef, releaseSearchJumpAfterFrame]
    )

    return useCallback(
        async (messageId: string, messageSnapshot?: MessageData) => {
            let messageElement = findMessageElement(messageId)
            let shouldReleaseSearchJump = false
            let shouldPrimeSearchContext = false

            if (!messageElement && messageSnapshot) {
                shouldReleaseSearchJump = true
                shouldPrimeSearchContext = mergeSearchResultSnapshot(messageSnapshot)
                messageElement = await waitForMessageElement(messageId)
            }

            if (!messageElement) {
                messageElement = await loadUntilMessageVisible(messageId)
            }

            if (!messageElement) {
                console.warn("Message not found:", messageId)
                showErrorToast(t("toast.messageNotLoaded"))
                if (shouldReleaseSearchJump) {
                    releaseSearchJumpAfterFrame()
                }
                return
            }

            highlightMessageElement(messageElement, stickToBottomContextRef)
            if (shouldReleaseSearchJump) {
                primeSearchContextAndRelease(shouldPrimeSearchContext)
            }
        },
        [
            loadUntilMessageVisible,
            mergeSearchResultSnapshot,
            primeSearchContextAndRelease,
            releaseSearchJumpAfterFrame,
            stickToBottomContextRef,
            t,
        ]
    )
}
