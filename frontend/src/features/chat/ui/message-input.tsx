import { ArrowUp, Image, Plus, Reply, X } from "lucide-react"
import {
    type ChangeEvent,
    type KeyboardEvent,
    type ReactNode,
    type Ref,
    useRef,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Spinner } from "@/shared/ui/spinner"
import { type MentionResult, type Participant, useMentions } from "../model/hooks/use-mentions"
import { AttachmentPreview } from "./attachment-preview"
import { MentionCommand } from "./mention-command"

export interface MentionData {
    type: "user" | "role"
    id: string
    name: string
}

interface ReplyingTo {
    id: string
    content: string
    senderName: string
}

interface MessageInputProps {
    value?: string
    onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit?: (message: string, mentions?: MentionData[]) => boolean | Promise<boolean>
    onFileUpload?: () => void
    onFilesSelected?: (files: File[]) => void
    onRemoveFile?: (index: number) => void
    placeholder?: string
    className?: string
    showSendButton?: boolean
    showFileButton?: boolean
    disabled?: boolean
    actions?: ReactNode
    maxlength?: number
    onTyping?: () => void
    onStopTyping?: () => void
    selectedFiles?: File[]
    isSubmitting?: boolean
    autoFocus?: boolean
    replyingTo?: ReplyingTo | null
    onCancelReply?: () => void
    participants?: Participant[]
    currentUserId?: string
    canMentionRoles?: boolean
    enableMentions?: boolean
}

export const MessageInput = ({
    value = "",
    onChange,
    onSubmit,
    onFileUpload,
    onFilesSelected,
    onRemoveFile,
    placeholder,
    className,
    showSendButton = true,
    showFileButton = true,
    disabled = false,
    actions,
    maxlength,
    onTyping,
    onStopTyping,
    selectedFiles = [],
    isSubmitting = false,
    // biome-ignore lint/correctness/noUnusedFunctionParameters: parameter is part of externally-imposed component/hook props signature
    autoFocus = false,
    replyingTo,
    onCancelReply,
    participants = [],
    currentUserId,
    canMentionRoles = true,
    enableMentions = false,
    ref,
}: MessageInputProps & { ref?: Ref<HTMLTextAreaElement> }) => {
    const { t } = useTranslation("chat")
    const resolvedPlaceholder = placeholder ?? t("input.typePlaceholder")
    const [inputValue, setInputValue] = useState(value)
    const [collectedMentions, setCollectedMentions] = useState<MentionData[]>([])
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isTypingRef = useRef(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    const handleInsertMention = (
        text: string,
        startIndex: number,
        endIndex: number,
        mention: MentionResult
    ) => {
        const before = inputValue.slice(0, startIndex)
        const after = inputValue.slice(endIndex)
        const newValue = before + text + after

        setInputValue(newValue)
        setCollectedMentions((prev) => {
            const exists = prev.some((m) => m.type === mention.type && m.id === mention.id)
            if (exists) return prev
            return [...prev, { type: mention.type, id: mention.id, name: mention.name }]
        })

        requestAnimationFrame(() => {
            const textarea = textareaRef.current
            if (textarea) {
                textarea.focus()
                const cursorPos = startIndex + text.length
                textarea.setSelectionRange(cursorPos, cursorPos)
            }
        })
    }

    const mentions = useMentions({
        participants,
        currentUserId,
        canMentionRoles,
        onInsertMention: handleInsertMention,
    })

    const handleTypingIndicator = (hasContent: boolean) => {
        if (hasContent && onTyping && !isTypingRef.current) {
            onTyping()
            isTypingRef.current = true
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (isTypingRef.current && onStopTyping) {
                onStopTyping()
                isTypingRef.current = false
            }
        }, 7500)
    }

    const onInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        let newValue = e.target.value

        if (maxlength && newValue.length > maxlength) {
            newValue = newValue.slice(0, maxlength)
            e.target.value = newValue
        }

        setInputValue(newValue)
        onChange?.(e)

        handleTypingIndicator(newValue.trim().length > 0)

        if (enableMentions) {
            const cursorPosition = e.target.selectionStart ?? newValue.length
            mentions.detectMentionTrigger(newValue, cursorPosition)
        }
    }

    const stopTypingIndicator = () => {
        if (isTypingRef.current && onStopTyping) {
            onStopTyping()
            isTypingRef.current = false
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
    }

    const sendMessage = async (message: string) => {
        if (disabled || !onSubmit) return

        stopTypingIndicator()
        const submitted = await Promise.resolve(
            onSubmit(message, collectedMentions.length > 0 ? collectedMentions : undefined)
        ).catch(() => false)

        if (!submitted) return

        setInputValue("")
        setCollectedMentions([])
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (enableMentions && mentions.handleKeyDown(e)) {
            return
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const message = e.currentTarget.value.trim()
            if (message || selectedFiles.length > 0) {
                void sendMessage(message)
            }
        }
    }

    const onSelectionChange = () => {
        if (!enableMentions) return
        const textarea = textareaRef.current
        if (!textarea) return
        mentions.checkCursorPosition(inputValue, textarea.selectionStart)
    }

    const openFileDialog = () => {
        onFileUpload?.()
        fileInputRef.current?.click()
    }

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            onFilesSelected?.(files)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const setTextareaRef = (element: HTMLTextAreaElement | null) => {
        textareaRef.current = element
        mentions.textareaRef.current = element

        if (typeof ref === "function") {
            ref(element)
        } else if (ref) {
            ref.current = element
        }
    }

    const canSend = inputValue.trim() || selectedFiles.length > 0

    return (
        <div className="relative">
            {enableMentions && mentions.state.isOpen && (
                <div className="absolute right-0 bottom-full left-0 z-50 mb-2">
                    <MentionCommand
                        roles={mentions.filteredRoles}
                        members={mentions.filteredParticipants}
                        selectedValue={mentions.selectedValue}
                        query={mentions.state.query}
                        onSelect={mentions.handleSelect}
                    />
                </div>
            )}

            <div
                className={cn(
                    "relative flex flex-col gap-0 rounded-sm border border-ds-surface-border bg-ds-surface transition-[border-color,box-shadow] focus-within:border-ds-gray-600 focus-within:ring-3 focus-within:ring-ds-gray-600/40 hover:border-ds-gray-600",
                    disabled && "pointer-events-none",
                    className
                )}
            >
                {replyingTo && (
                    <div className="flex items-center gap-2 rounded-t-sm border-ds-surface-border border-b bg-ds-bg-subtle py-2 pr-2 pl-3">
                        <Reply className="size-3.5 flex-shrink-0 text-ds-fg-subtle" />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="font-medium text-ds-fg text-xs">
                                {t("input.replyingTo", { name: replyingTo.senderName })}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0 p-0"
                            onClick={onCancelReply}
                            aria-label={t("input.cancelReply")}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                )}

                <div className="px-3 pt-3">
                    <textarea
                        ref={setTextareaRef}
                        value={inputValue}
                        onChange={onInputChange}
                        onKeyDown={onKeyDown}
                        onSelect={onSelectionChange}
                        disabled={disabled}
                        placeholder={resolvedPlaceholder}
                        className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0"
                    />
                </div>

                {selectedFiles.length > 0 && onRemoveFile && (
                    <AttachmentPreview files={selectedFiles} onRemove={onRemoveFile} />
                )}

                <div className="flex items-center justify-between px-3 pt-2 pb-3">
                    <div className="flex items-center gap-2">
                        {showFileButton && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        radius="full"
                                        size="sm"
                                        className="h-8 w-8 flex-shrink-0 p-0"
                                        disabled={disabled}
                                        aria-label={t("input.attachFile")}
                                    >
                                        <Plus className="h-4 w-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={openFileDialog}>
                                        <Image className="mr-1 size-4 text-ds-fg" />
                                        {t("input.addPhotosOrFiles")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            multiple
                            onChange={onFileChange}
                            className="hidden"
                        />
                        {actions}
                    </div>

                    <div className="flex items-center gap-2">
                        {maxlength && inputValue.length > maxlength * 0.9 && (
                            <div
                                className={cn(
                                    "px-2 text-right font-medium text-xs",
                                    inputValue.length === maxlength
                                        ? "text-ds-danger-text"
                                        : "text-ds-fg-muted"
                                )}
                            >
                                {maxlength - inputValue.length}
                            </div>
                        )}

                        {showSendButton && (
                            <Button
                                type="button"
                                variant="solid"
                                radius="full"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    if (canSend) {
                                        void sendMessage(inputValue.trim())
                                    }
                                }}
                                disabled={disabled || isSubmitting || !canSend}
                                aria-label={isSubmitting ? t("input.sending") : t("input.send")}
                            >
                                {isSubmitting ? (
                                    <Spinner className="size-5 text-white" />
                                ) : (
                                    <ArrowUp className="size-5 text-white" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
