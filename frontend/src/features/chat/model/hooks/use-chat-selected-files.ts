import { type Dispatch, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { showErrorToast } from "@/shared/ui/toasts"
import type { ChatAction } from "../chat.reducer"

interface UseChatSelectedFilesOptions {
    selectedFiles: File[]
    dispatch: Dispatch<ChatAction>
    setShouldScrollToBottom: (value: boolean) => void
}

export function useChatSelectedFiles({
    selectedFiles,
    dispatch,
    setShouldScrollToBottom,
}: UseChatSelectedFilesOptions) {
    const { t } = useTranslation("chat")

    const addSelectedFiles = useCallback(
        (files: File[]) => {
            const maxFiles = 5
            const currentTotal = selectedFiles.length + files.length

            if (currentTotal > maxFiles) {
                showErrorToast(t("attachmentUpload.maxFiles", { count: maxFiles }))
                return
            }

            dispatch({ type: "ADD_SELECTED_FILES", files })
            setShouldScrollToBottom(true)
        },
        [dispatch, selectedFiles.length, setShouldScrollToBottom, t]
    )

    const removeSelectedFile = useCallback(
        (index: number) => {
            dispatch({
                type: "SET_SELECTED_FILES",
                files: selectedFiles.filter((_, i) => i !== index),
            })
        },
        [dispatch, selectedFiles]
    )

    return {
        addSelectedFiles,
        removeSelectedFile,
    }
}
