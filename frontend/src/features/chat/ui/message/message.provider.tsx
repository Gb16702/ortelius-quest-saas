import { memo, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatSenderName } from "@/shared/lib/name"
import {
    type MessageActions,
    MessageContext,
    type MessageMeta,
    type MessagePermissions,
    type MessageState,
} from "./message.context"

interface MessageProviderProps {
    data: MessageState
    actions: MessageActions
    meta: MessageMeta
    children: ReactNode
}

function getAttachmentUrlSignature(metadata: MessageState["metadata"]): string {
    const attachments = metadata?.attachments
    if (!attachments?.length) return ""

    return attachments
        .map(
            (attachment) =>
                `${attachment.id}:${attachment.url ?? ""}:${attachment.downloadUrl ?? ""}`
        )
        .join("|")
}

const MessageProviderBase = ({ data, actions, meta, children }: MessageProviderProps) => {
    const { t } = useTranslation("chat")
    const permissions = useMemo((): MessagePermissions => {
        const isOwnMessage = data.senderId === meta.userId

        const viewerInSameOrg = Boolean(
            data.organizationName &&
                meta.userOrganizationId &&
                meta.conversationOrganizationId &&
                meta.userOrganizationId === meta.conversationOrganizationId
        )

        const senderName = isOwnMessage
            ? t("message.you")
            : data.senderInfo
              ? formatSenderName(data.senderInfo.name)
              : t("message.someone")

        const now = new Date()
        const messageTime = new Date(data.createdAt)
        const diffMs = now.getTime() - messageTime.getTime()
        const isWithin15Minutes = diffMs <= 15 * 60 * 1000

        const canEdit = isOwnMessage && isWithin15Minutes && !data.isOptimistic
        const canDelete = isOwnMessage && isWithin15Minutes && !data.isOptimistic
        const canReply = !data.isOptimistic
        const canPin = !data.isOptimistic && Boolean(actions.onPin) && !data.isPinned

        const canUnpin = (() => {
            if (data.isOptimistic || !data.isPinned || !actions.onUnpin) return false
            const isMessageAuthor = data.senderId === meta.userId
            const isAdminOrOwner =
                meta.currentUserRole === "admin" || meta.currentUserRole === "owner"
            return isMessageAuthor || isAdminOrOwner
        })()

        return {
            isOwnMessage,
            viewerInSameOrg,
            senderName,
            canEdit,
            canDelete,
            canReply,
            canPin,
            canUnpin,
        }
    }, [data, meta, actions.onPin, actions.onUnpin, t])

    const contextValue = useMemo(
        () => ({ state: data, actions, meta, permissions }),
        [data, actions, meta, permissions]
    )

    return <MessageContext.Provider value={contextValue}>{children}</MessageContext.Provider>
}

export const MessageProvider = memo(
    MessageProviderBase,
    (prev, next) =>
        prev.data.id === next.data.id &&
        prev.data.content === next.data.content &&
        prev.data.isEdited === next.data.isEdited &&
        prev.data.isDeleted === next.data.isDeleted &&
        prev.data.isPinned === next.data.isPinned &&
        prev.data.shouldShowSeen === next.data.shouldShowSeen &&
        prev.data.hasAvatar === next.data.hasAvatar &&
        prev.data.isLastInGroup === next.data.isLastInGroup &&
        prev.data.isOptimistic === next.data.isOptimistic &&
        prev.data.readers?.length === next.data.readers?.length &&
        prev.data.messageType === next.data.messageType &&
        prev.data.replyTo?.id === next.data.replyTo?.id &&
        prev.data.replyTo?.content === next.data.replyTo?.content &&
        prev.data.replyTo?.isDeleted === next.data.replyTo?.isDeleted &&
        prev.data.metadata?.type === next.data.metadata?.type &&
        prev.data.metadata?.mentions?.length === next.data.metadata?.mentions?.length &&
        getAttachmentUrlSignature(prev.data.metadata) ===
            getAttachmentUrlSignature(next.data.metadata) &&
        prev.meta === next.meta &&
        prev.actions === next.actions
)
