import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { formatSenderName } from "@/shared/lib/name"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"

interface ReplyContextProps {
    senderName: string
    content: string
    isOwnReply: boolean
    replyToId?: string
    senderImage?: string | null
    isDeleted?: boolean
}

export const ReplyContext = ({
    senderName,
    content,
    isOwnReply,
    replyToId,
    senderImage,
    isDeleted = false,
}: ReplyContextProps) => {
    const { t } = useTranslation("chat")
    const displayName = isOwnReply ? t("message.you") : formatSenderName(senderName)
    const displayContent = isDeleted ? t("message.deleted") : content
    const truncatedContent =
        displayContent.length > 100 ? `${displayContent.slice(0, 100)}...` : displayContent

    const scrollToMessage = useCallback(() => {
        if (!replyToId) return

        const messageElement = document.querySelector(
            `[data-message-id="${replyToId}"]`
        ) as HTMLElement

        if (messageElement) {
            messageElement.scrollIntoView({
                block: "center",
                behavior: "smooth",
            })
            messageElement.classList.add("message-highlight")
            setTimeout(() => {
                messageElement.classList.remove("message-highlight")
            }, 5000)
        }
    }, [replyToId])

    const innerContent = (
        <div className="line-clamp-1 flex min-w-0 flex-1 flex-row items-center gap-1.5">
            <GeneratedAvatar
                src={senderImage}
                alt={displayName}
                fallbackText={senderName}
                size="xxs"
                className="flex-shrink-0"
            />
            <span className="font-medium text-ds-fg text-xs">{displayName}</span>
            <p
                className={`whitespace-pre-wrap font-normal text-xs ${isDeleted ? "text-ds-fg-muted italic" : "text-ds-fg"}`}
            >
                {truncatedContent}
            </p>
        </div>
    )

    const wrapperClass = `mb-2 flex items-start pl-10 relative before:absolute before:left-0 before:top-[6px] before:h-[14px] before:w-[30px] before:border-l-2 before:border-t-2 before:border-ds-surface-border hover:before:border-ds-surface-border before:rounded-tl-sm before:transition-colors before:duration-300 ${
        replyToId ? "cursor-pointer text-left w-full" : ""
    }`

    if (replyToId) {
        return (
            <button type="button" className={wrapperClass} onClick={scrollToMessage}>
                {innerContent}
            </button>
        )
    }

    return <div className={wrapperClass}>{innerContent}</div>
}
