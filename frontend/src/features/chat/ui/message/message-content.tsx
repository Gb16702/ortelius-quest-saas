import { type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { ReplyContext } from "../reply.context"
import { useMessage } from "./message.context"
import { useMessageEdit } from "./message-edit.context"

export const MessageContent = () => {
    const { t } = useTranslation("chat")
    const { state, actions, meta } = useMessage()
    const { isEditMode } = useMessageEdit()

    // FIXME: refactor pending
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
    const renderContentWithMentions = useMemo(() => {
        const mentions = state.metadata?.mentions
        if (!mentions || mentions.length === 0) return state.content

        const parts: ReactNode[] = []
        let remaining = state.content

        for (const mention of mentions) {
            const mentionText = `@${mention.name}`
            const index = remaining.indexOf(mentionText)

            if (index !== -1) {
                if (index > 0) {
                    parts.push(remaining.slice(0, index))
                }

                const isCurrentUser =
                    (mention.type === "user" && mention.id === meta.userId) ||
                    (mention.type === "role" && mention.id === meta.currentUserRole)

                const isClickable = mention.type === "user" && actions.onViewProfile

                const mentionClass = cn(
                    "rounded-sm px-1 py-0.5",
                    isCurrentUser
                        ? "bg-ds-amber-100 text-ds-amber-900"
                        : "bg-ds-blue-100 text-ds-blue-900",
                    isClickable && "cursor-pointer hover:opacity-90"
                )

                if (isClickable) {
                    parts.push(
                        <button
                            type="button"
                            key={`${mention.id}-${parts.length}`}
                            onClick={() => actions.onViewProfile?.(mention.id)}
                            className={mentionClass}
                        >
                            {mentionText}
                        </button>
                    )
                } else {
                    parts.push(
                        <span key={`${mention.id}-${parts.length}`} className={mentionClass}>
                            {mentionText}
                        </span>
                    )
                }

                remaining = remaining.slice(index + mentionText.length)
            }
        }

        if (remaining) {
            parts.push(remaining)
        }

        return parts.length > 0 ? parts : state.content
    }, [
        state.content,
        state.metadata?.mentions,
        meta.userId,
        meta.currentUserRole,
        actions.onViewProfile,
    ])

    return (
        <>
            {state.replyTo && !state.isDeleted && (
                <ReplyContext
                    senderName={state.replyTo.senderName}
                    content={state.replyTo.content}
                    isOwnReply={state.replyTo.senderId === meta.userId}
                    replyToId={state.replyTo.id}
                    senderImage={state.replyTo.senderImage}
                    isDeleted={state.replyTo.isDeleted}
                />
            )}
            {state.isDeleted ? (
                <p className="text-ds-fg-muted text-sm italic">{t("message.deleted")}</p>
            ) : (
                state.content.trim() &&
                !isEditMode && (
                    <p className="whitespace-pre-wrap break-words text-ds-fg-muted text-sm leading-relaxed">
                        {renderContentWithMentions}
                        {state.isEdited && (
                            <span className="text-[10px] text-ds-fg-subtle">
                                {" "}
                                {t("message.edited")}
                            </span>
                        )}
                    </p>
                )
            )}
        </>
    )
}
