import { createContext, type RefObject, use } from "react"

export interface MessageEditState {
    isEditMode: boolean
    enterEditMode: () => void
    cancelEdit: () => void
    editContent: string
    setEditContent: (content: string) => void
    saveEdit: () => Promise<void>
    isSaving: boolean
    textareaRef: RefObject<HTMLTextAreaElement | null>
    processEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export const MessageEditContext = createContext<MessageEditState | null>(null)

export const useMessageEdit = (): MessageEditState => {
    const context = use(MessageEditContext)
    if (!context) {
        throw new Error("useMessageEdit must be used within a Message.Frame")
    }
    return context
}
