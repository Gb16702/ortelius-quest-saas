import { type ReactNode, useEffect, useRef, useState } from "react"
import { ReadReceipts } from "../read-receipts"
import { useMessage } from "./message.context"
import { MessageEditContext, type MessageEditState } from "./message-edit.context"
import { MessageToolbar } from "./message-toolbar"

interface MessageFrameProps {
    children: ReactNode
}

export const MessageFrame = ({ children }: MessageFrameProps) => {
    const { state, actions, permissions } = useMessage()
    const [isHovered, setIsHovered] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editContent, setEditContent] = useState(state.content)
    const [isSaving, setIsSaving] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const hasContent = state.content.trim()
    const hasAttachments = state.metadata?.attachments && state.metadata.attachments.length > 0

    const enterEditMode = () => {
        setIsEditMode(true)
        setEditContent(state.content)
    }

    const cancelEdit = () => {
        setIsEditMode(false)
        setEditContent(state.content)
    }

    const saveEdit = async () => {
        if (!editContent.trim() || editContent === state.content || !actions.onSaveEdit) return

        setIsSaving(true)
        try {
            await actions.onSaveEdit(state.id, editContent.trim())
            setIsEditMode(false)
        } catch (error) {
            console.error("Failed to save edit:", error)
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        if (isEditMode && textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
            )
        }
    }, [isEditMode])

    const processEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape") {
            e.preventDefault()
            cancelEdit()
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            saveEdit()
        }
    }

    const editState: MessageEditState = {
        isEditMode,
        enterEditMode,
        cancelEdit,
        editContent,
        setEditContent,
        saveEdit,
        isSaving,
        textareaRef,
        processEditKeyDown,
    }

    if (!hasContent && !hasAttachments) {
        return null
    }

    return (
        <MessageEditContext.Provider value={editState}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only handler that toggles the visibility of the message toolbar; no keyboard interaction needed since toolbar buttons are independently focusable */}
            <div
                className="group relative flex w-full justify-start"
                data-message-id={state.id}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex w-full flex-col">
                    <div className="max-w-5xl space-y-2 whitespace-pre-wrap rounded-md">
                        {children}
                    </div>
                    {permissions.isOwnMessage &&
                        state.shouldShowSeen &&
                        !state.isOptimistic &&
                        state.readers.length > 0 && <ReadReceipts readers={state.readers} />}
                </div>
                {!state.isDeleted && isHovered && !isEditMode && (
                    <MessageToolbar isHovered={isHovered} />
                )}
            </div>
        </MessageEditContext.Provider>
    )
}
