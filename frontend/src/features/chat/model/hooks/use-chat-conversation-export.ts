import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { isAdminOrOwner, parseRole } from "@/entities/access"
import { exportToCSV } from "@/shared/lib/csv"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { formatChatSystemEvent } from "../../lib/chat-system-event"
import type { Conversation, MessageData } from "../chat"

interface UseChatConversationExportOptions {
    allMessages: MessageData[]
    currentConversation: Conversation | undefined
    setExporting: (isExporting: boolean) => void
}

type Translate = (key: string, options?: Record<string, unknown>) => string

function formatExportMessage(message: MessageData, t: Translate): string {
    if (message.isDeleted) return t("export.deleted")
    if (message.messageType !== "system") return message.content

    return formatChatSystemEvent({
        content: message.content,
        metadata: message.metadata,
        t,
    })
}

function toExportRow(message: MessageData, t: Translate) {
    return {
        Date: new Date(message.createdAt).toLocaleString(),
        "Sender Name":
            message.messageType === "system"
                ? t("export.system")
                : message.senderName || t("export.unknown"),
        "Sender Type": message.organizationName ? t("export.organization") : t("export.user"),
        "Organization Name": message.organizationName || t("export.notAvailable"),
        "Member Role": message.memberRole || t("export.notAvailable"),
        Message: formatExportMessage(message, t),
        Attachments:
            message.metadata?.attachments
                ?.map((attachment) => attachment.originalName)
                .join("; ") || t("export.none"),
        Edited: message.isEdited ? t("export.yes") : t("export.no"),
        Deleted: message.isDeleted ? t("export.yes") : t("export.no"),
    }
}

export function useChatConversationExport({
    allMessages,
    currentConversation,
    setExporting,
}: UseChatConversationExportOptions): () => Promise<void> {
    const { t } = useTranslation("chat")

    return useCallback(async () => {
        if (!allMessages || allMessages.length === 0) {
            showErrorToast(t("toast.noMessagesToExport"))
            return
        }

        if (currentConversation?.isTeamChat) {
            const parsedRole = parseRole(currentConversation?.role)
            if (!parsedRole || !isAdminOrOwner(parsedRole)) {
                showErrorToast(t("toast.exportTeamAdminsOnly"))
                return
            }
        }

        const conversationName = currentConversation?.name || t("conversation.fallbackTitle")

        const attempt = async () => {
            setExporting(true)
            try {
                const csvData = [...allMessages]
                    .sort(
                        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    )
                    .map((message) => toExportRow(message, t))

                const timestamp = new Date().toISOString().split("T")[0]
                exportToCSV(csvData, `${conversationName}-messages-${timestamp}.csv`)
                showSuccessToast(t("toast.exported", { count: csvData.length }))
            } catch (error) {
                console.error("Export error:", error)
                showRetryErrorToast(t("toast.exportFailed"), {
                    onRetry: () => void attempt(),
                })
            } finally {
                setExporting(false)
            }
        }

        await attempt()
    }, [
        allMessages,
        currentConversation?.name,
        currentConversation?.isTeamChat,
        currentConversation?.role,
        setExporting,
        t,
    ])
}
