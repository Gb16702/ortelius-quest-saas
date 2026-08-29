import { type Dispatch, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { deleteChatMessage, updateChatMessage } from "../../api/chat.mutations"
import type { ChatAction, DeletingMessage } from "../chat.reducer"

interface UseChatMessageEditActionsOptions {
    deletingMessage: DeletingMessage | null
    dispatch: Dispatch<ChatAction>
}

export function useChatMessageEditActions({
    deletingMessage,
    dispatch,
}: UseChatMessageEditActionsOptions) {
    const { t } = useTranslation("chat")

    const initiateMessageEdit = useCallback(
        (messageId: string, content: string) => {
            dispatch({
                type: "SET_EDITING_MESSAGE",
                editingMessage: { messageId, content },
            })
        },
        [dispatch]
    )

    const promptDeleteMessage = useCallback(
        (
            messageId: string,
            content: string,
            senderName: string,
            senderImage: string | null | undefined,
            createdAt: string
        ) => {
            dispatch({
                type: "SET_DELETING_MESSAGE",
                deletingMessage: {
                    id: messageId,
                    content,
                    senderName,
                    senderImage,
                    createdAt,
                },
            })
        },
        [dispatch]
    )

    const clearDeletingMessage = useCallback(() => {
        dispatch({ type: "CLEAR_DELETING_MESSAGE" })
    }, [dispatch])

    const confirmDeleteMessage = useCallback(async () => {
        if (!deletingMessage) return
        const messageId = deletingMessage.id

        const attempt = async () => {
            try {
                await deleteChatMessage(messageId)

                dispatch({
                    type: "DELETE_MESSAGE",
                    messageId,
                })

                showSuccessToast(t("toast.messageDeleted"))
                dispatch({ type: "CLEAR_DELETING_MESSAGE" })
            } catch (error) {
                console.error("Error deleting message:", error)
                showRetryErrorToast(
                    error instanceof Error ? error.message : t("toast.deleteMessageFailedWindow"),
                    { onRetry: () => void attempt() }
                )
            }
        }

        await attempt()
    }, [deletingMessage, dispatch, t])

    const saveMessageEdit = useCallback(
        async (messageId: string, newContent: string) => {
            try {
                await updateChatMessage({ messageId, content: newContent })

                dispatch({
                    type: "UPDATE_MESSAGE",
                    messageId,
                    updates: { content: newContent, isEdited: true },
                })

                showSuccessToast(t("toast.messageUpdated"))
            } catch (error) {
                console.error("Error updating message:", error)
                showErrorToast(
                    error instanceof Error ? error.message : t("toast.updateMessageFailedWindow")
                )
                throw error
            }
        },
        [dispatch, t]
    )

    return {
        initiateMessageEdit,
        promptDeleteMessage,
        clearDeletingMessage,
        confirmDeleteMessage,
        saveMessageEdit,
    }
}
