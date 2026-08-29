import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
    type FavoriteItem,
    favoriteKeys,
    rememberFavoriteConversationDisplay,
    updateFavoriteQueryData,
} from "@/entities/favorite"
import { getErrorMessage } from "@/shared/lib/error"
import { showPromiseToast } from "@/shared/ui/toasts"
import { setConversationPinnedState } from "../../api/chat.mutations"
import { chatKeys } from "../../api/chat.query-keys"
import {
    applyConversationPinnedState,
    updateCachedConversationFeeds,
    updateCachedInitialConversationPages,
} from "../../api/conversation-feed.cache"
import {
    getConversationDisplayName,
    getConversationDisplayType,
    getConversationFavoriteDisplayMetadata,
} from "../../lib/conversation-display"
import type { Conversation } from "../chat"
import { useToggleMutationQueue } from "./use-toggle-mutation-queue"

interface UseChatConversationPinActionsOptions {
    userId: string | undefined
    organizationId: string | undefined
    conversationScope: string
    onOptimisticChange?: (conversationId: string, isPinned: boolean, pinnedAt: string) => void
}

type QueueConversationPinToggle = (
    conversationId: string,
    nextValue: boolean,
    currentValue: boolean
) => Promise<boolean>

function getConversationPinToggleKey(conversationId: string, isPinned: boolean): string {
    return `${conversationId}:${isPinned ? "pin" : "unpin"}`
}

function getConversationPinToastId(conversationId: string): string {
    return `conversation-pin-toggle:${conversationId}`
}

export function useChatConversationPinActions({
    userId,
    organizationId,
    conversationScope,
    onOptimisticChange,
}: UseChatConversationPinActionsOptions) {
    const { t } = useTranslation("chat")
    const queryClient = useQueryClient()
    const queueConversationPinToggleRef = useRef<QueueConversationPinToggle | null>(null)
    const suppressedUndoActionKeysRef = useRef(new Set<string>())
    const optimisticConversationByIdRef = useRef(new Map<string, Conversation>())

    const invalidateConversationCaches = useCallback(() => {
        if (!userId) return

        void queryClient.invalidateQueries({
            queryKey: chatKeys.conversationsFeedScope({
                userId,
                scope: conversationScope,
            }),
        })
        void queryClient.invalidateQueries({
            queryKey: chatKeys.initialConversationsPageScope({
                userId,
                scope: conversationScope,
            }),
        })
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.all, refetchType: "none" })
    }, [conversationScope, queryClient, userId])

    const applyPinnedState = useCallback(
        (conversationId: string, isPinned: boolean, pinnedAt: string) => {
            const applyState = (conversation: Conversation) =>
                applyConversationPinnedState(conversation, {
                    conversationId,
                    isPinned,
                    pinnedAt,
                })

            updateCachedConversationFeeds(
                queryClient,
                { userId, scope: conversationScope },
                applyState
            )
            updateCachedInitialConversationPages(
                queryClient,
                { userId, scope: conversationScope },
                applyState
            )
            const conversation = optimisticConversationByIdRef.current.get(conversationId)
            if (conversation) {
                const metadata = getConversationFavoriteDisplayMetadata(conversation)
                rememberFavoriteConversationDisplay({
                    organizationId: organizationId ?? conversation.organizationId ?? null,
                    conversationId: conversation.id,
                    ...metadata,
                })
                updateFavoriteQueryData(queryClient, {
                    organizationId,
                    favorite: createOptimisticConversationFavorite({
                        conversation,
                        organizationId,
                        pinnedAt,
                    }),
                    isFavorited: isPinned,
                })
            }
        },
        [conversationScope, organizationId, queryClient, userId]
    )

    const queueConversationPinToggle = useToggleMutationQueue({
        mutate: ({ id: conversationId, nextValue }) => {
            const promise = setConversationPinnedState({
                conversationId,
                isPinned: nextValue,
            })
            const toggleKey = getConversationPinToggleKey(conversationId, nextValue)
            const shouldOfferUndo = !suppressedUndoActionKeysRef.current.delete(toggleKey)

            return showPromiseToast(promise, {
                id: getConversationPinToastId(conversationId),
                loading: nextValue
                    ? t("toast.addingFavorite", { defaultValue: "Adding favorite" })
                    : t("toast.removingFavorite", { defaultValue: "Removing favorite" }),
                success: nextValue
                    ? t("toast.favoriteAdded", { defaultValue: "Favorite added" })
                    : t("toast.favoriteRemoved", { defaultValue: "Favorite removed" }),
                ...(shouldOfferUndo
                    ? {
                          successAction: {
                              label: t("toast.undo"),
                              onClick: () => {
                                  suppressedUndoActionKeysRef.current.add(
                                      getConversationPinToggleKey(conversationId, !nextValue)
                                  )
                                  const conversation =
                                      optimisticConversationByIdRef.current.get(conversationId)
                                  if (!conversation) return

                                  void queueConversationPinToggleRef.current?.(
                                      conversationId,
                                      !nextValue,
                                      nextValue
                                  )
                              },
                          },
                      }
                    : {}),
                error: (error) =>
                    getErrorMessage(
                        error,
                        nextValue
                            ? t("toast.addFavoriteFailed", {
                                  defaultValue: "Failed to add favorite",
                              })
                            : t("toast.removeFavoriteFailed", {
                                  defaultValue: "Failed to remove favorite",
                              })
                    ),
            })
        },
        onOptimisticChange: ({ id: conversationId, nextValue }) => {
            const pinnedAt = new Date().toISOString()
            onOptimisticChange?.(conversationId, nextValue, pinnedAt)
            applyPinnedState(conversationId, nextValue, pinnedAt)
        },
        onSuccess: () => {
            invalidateConversationCaches()
        },
        onError: ({ error }) => {
            console.error("Failed to update conversation pin state:", error)
            invalidateConversationCaches()
        },
    })
    queueConversationPinToggleRef.current = queueConversationPinToggle

    return useCallback(
        (conversation: Conversation, nextValue: boolean, currentValue: boolean) => {
            optimisticConversationByIdRef.current.set(conversation.id, conversation)
            void queueConversationPinToggle(conversation.id, nextValue, currentValue)
        },
        [queueConversationPinToggle]
    )
}

function createOptimisticConversationFavorite({
    conversation,
    organizationId,
    pinnedAt,
}: {
    conversation: Conversation
    organizationId: string | undefined
    pinnedAt: string
}): FavoriteItem {
    const label = getOptimisticConversationFavoriteLabel(conversation)
    const conversationType = getConversationDisplayType(conversation)

    return {
        id: `optimistic:conversation:${conversation.id}`,
        entityType: "conversation",
        entityId: conversation.id,
        organizationId: organizationId ?? conversation.organizationId ?? null,
        label,
        subtitle: "Conversation",
        createdAt: pinnedAt,
        meta: {
            conversationType,
            isTeamChat: conversationType === "team",
            name: label,
            requesterName: conversationType === "requester" ? label : null,
            participantName: conversationType === "member_dm" ? label : null,
        },
    }
}

function getOptimisticConversationFavoriteLabel(conversation: Conversation): string {
    return getConversationDisplayName(conversation)
}
