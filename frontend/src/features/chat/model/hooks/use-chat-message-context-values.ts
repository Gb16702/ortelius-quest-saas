import { useMemo } from "react"
import type { SessionResponse } from "@/entities/session"
import type {
    MessageActions,
    MessageMeta,
    RequestMessageIntegration,
} from "../../ui/message/message.context"
import type { Conversation } from "../chat"

interface UseChatMessageContextValuesOptions {
    currentConversation: Conversation | undefined
    initiateMessageEdit: (messageId: string, content: string) => void
    onViewMemberProfile?: (userId: string) => void
    openPinnedMessagesMenu: () => void
    pinMessage: (messageId: string) => Promise<boolean>
    promptDeleteMessage: (
        messageId: string,
        content: string,
        senderName: string,
        senderImage: string | null | undefined,
        createdAt: string
    ) => void
    replyToMessage: (messageId: string, content: string, senderName: string) => void
    requestIntegration?: RequestMessageIntegration
    saveMessageEdit: (messageId: string, newContent: string) => Promise<void>
    sessionData: SessionResponse | null
    unpinMessage: (messageId: string) => Promise<boolean>
    userId: string | undefined
}

export function useChatMessageContextValues({
    currentConversation,
    initiateMessageEdit,
    onViewMemberProfile,
    openPinnedMessagesMenu,
    pinMessage,
    promptDeleteMessage,
    replyToMessage,
    requestIntegration,
    saveMessageEdit,
    sessionData,
    unpinMessage,
    userId,
}: UseChatMessageContextValuesOptions) {
    const messageActions: MessageActions = useMemo(
        () => ({
            onReply: replyToMessage,
            onEdit: initiateMessageEdit,
            onDelete: promptDeleteMessage,
            onSaveEdit: saveMessageEdit,
            onViewProfile: currentConversation?.isTeamChat ? onViewMemberProfile : undefined,
            onPin: currentConversation?.isTeamChat ? pinMessage : undefined,
            onUnpin: currentConversation?.isTeamChat ? unpinMessage : undefined,
            onViewPinnedMessages: currentConversation?.isTeamChat
                ? openPinnedMessagesMenu
                : undefined,
        }),
        [
            replyToMessage,
            initiateMessageEdit,
            promptDeleteMessage,
            saveMessageEdit,
            currentConversation?.isTeamChat,
            onViewMemberProfile,
            pinMessage,
            unpinMessage,
            openPinnedMessagesMenu,
        ]
    )

    const messageMeta: MessageMeta = useMemo(
        () => ({
            userId: userId ?? "",
            userOrganizationId: sessionData?.session?.activeOrganizationId,
            conversationOrganizationId: currentConversation?.organizationId,
            isTeamChat: currentConversation?.isTeamChat ?? false,
            conversationType: currentConversation?.conversationType ?? "requester",
            currentUserRole: currentConversation?.role,
            requestIntegration,
        }),
        [
            userId,
            sessionData?.session?.activeOrganizationId,
            currentConversation?.organizationId,
            currentConversation?.isTeamChat,
            currentConversation?.conversationType,
            currentConversation?.role,
            requestIntegration,
        ]
    )

    return {
        messageActions,
        messageMeta,
    }
}
