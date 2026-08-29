import { type RefObject, useEffect } from "react"
import { isModifierKeyPressed } from "@/shared/lib/keyboard"

interface UseSearchKeyboardShortcutsProps {
    searchInputRef: RefObject<HTMLInputElement | null>
    hasSearchValue: boolean
    onClear: () => void
}

export function useSearchKeyboardShortcuts({
    searchInputRef,
    hasSearchValue,
    onClear,
}: UseSearchKeyboardShortcutsProps) {
    useEffect(() => {
        const onGlobalKeyDown = (event: KeyboardEvent) => {
            if (isModifierKeyPressed(event) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                searchInputRef.current?.focus()
            }
        }

        document.addEventListener("keydown", onGlobalKeyDown)
        return () => {
            document.removeEventListener("keydown", onGlobalKeyDown)
        }
    }, [searchInputRef])

    useEffect(() => {
        const inputElement = searchInputRef.current
        if (!inputElement || !hasSearchValue) return

        const onEscapeKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault()
                event.stopPropagation()
                onClear()
            }
        }

        inputElement.addEventListener("keydown", onEscapeKeyDown)
        return () => {
            inputElement.removeEventListener("keydown", onEscapeKeyDown)
        }
    }, [hasSearchValue, onClear, searchInputRef])
}
