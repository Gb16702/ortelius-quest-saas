import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { BreadcrumbNavItem } from "@/shared/ui/breadcrumb-nav"
import { getConversationDisplayName } from "../../lib/conversation-display"
import type { Conversation, MessageData } from "../chat"
import type { ReplyingTo } from "../chat.reducer"
import { EMPTY_PARTICIPANTS, type ReplyInputValue } from "../chat-page.context"
import type { TypingUserInfo } from "./use-web-socket-message"

interface UseChatPageDerivedStateOptions {
    allMessages: MessageData[]
    hrefBasePath: string
    breadcrumbItemsPrefix: BreadcrumbNavItem[]
    conversationId: string | undefined
    conversations: Conversation[]
    isInitialLoading: boolean
    replyingTo: ReplyingTo | null
    typingUsers: TypingUserInfo[]
    userId: string | undefined
}

export function useChatPageDerivedState({
    allMessages,
    hrefBasePath,
    breadcrumbItemsPrefix,
    conversationId,
    conversations,
    isInitialLoading,
    replyingTo,
    typingUsers,
    userId,
}: UseChatPageDerivedStateOptions) {
    const { t } = useTranslation("chat")
    const currentConversation = useMemo(
        () => conversations.find((conv) => conv.id === conversationId),
        [conversations, conversationId]
    )

    const displayMessages = useMemo(
        () =>
            [...allMessages].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ),
        [allMessages]
    )

    const userMessageIds = useMemo(() => {
        return allMessages
            .filter((msg) => msg.senderId === userId && msg.messageType !== "system")
            .map((msg) => msg.id)
    }, [allMessages, userId])

    const allMessageIds = useMemo(() => {
        return allMessages
            .filter((msg) => msg.messageType !== "system")
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((msg) => msg.id)
    }, [allMessages])

    const isMac = typeof window !== "undefined" && navigator.platform.toLowerCase().includes("mac")

    const breadcrumbItems: BreadcrumbNavItem[] = useMemo(() => {
        const conversationLabel = currentConversation
            ? getConversationDisplayName(currentConversation)
            : t("conversation.fallbackTitle")

        return [
            ...breadcrumbItemsPrefix,
            { label: t("page.title"), href: `${hrefBasePath}/chats` },
            {
                label: isInitialLoading ? t("conversation.loading") : conversationLabel,
            },
        ]
    }, [hrefBasePath, isInitialLoading, currentConversation, breadcrumbItemsPrefix, t])

    const typingUsersWithInfo = useMemo(() => {
        return typingUsers
            .filter((tu) => tu.userId !== userId)
            .map((typingUser) => ({
                type: "user" as const,
                id: typingUser.userId,
                name: typingUser.userName || t("searchDialog.fallbackUser"),
                image: typingUser.userImage || null,
            }))
    }, [typingUsers, userId, t])

    const participants = useMemo(
        () => currentConversation?.participants ?? EMPTY_PARTICIPANTS,
        [currentConversation?.participants]
    )

    const replyInputValue = useMemo<ReplyInputValue | null>(
        () =>
            replyingTo
                ? {
                      id: replyingTo.messageId,
                      content: replyingTo.content,
                      senderName: replyingTo.senderName,
                  }
                : null,
        [replyingTo]
    )

    return {
        allMessageIds,
        breadcrumbItems,
        currentConversation,
        displayMessages,
        isMac,
        participants,
        replyInputValue,
        typingUsersWithInfo,
        userMessageIds,
    }
}
