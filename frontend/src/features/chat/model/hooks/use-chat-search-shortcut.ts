import { type Dispatch, useEffect } from "react"
import { isModifierKeyPressed } from "@/shared/lib/keyboard"
import type { ChatAction } from "../chat.reducer"

interface UseChatSearchShortcutOptions {
    dispatch: Dispatch<ChatAction>
    isParticipantsDialogOpen: boolean
    isSearchDialogOpen: boolean
}

export function useChatSearchShortcut({
    dispatch,
    isParticipantsDialogOpen,
    isSearchDialogOpen,
}: UseChatSearchShortcutOptions): void {
    useEffect(() => {
        const onSearchShortcut = (event: KeyboardEvent) => {
            if (isModifierKeyPressed(event) && event.key.toLowerCase() === "k") {
                if (!isParticipantsDialogOpen && !isSearchDialogOpen) {
                    event.preventDefault()
                    dispatch({ type: "OPEN_SEARCH_DIALOG" })
                }
            }
        }

        document.addEventListener("keydown", onSearchShortcut)
        return () => {
            document.removeEventListener("keydown", onSearchShortcut)
        }
    }, [dispatch, isParticipantsDialogOpen, isSearchDialogOpen])
}
