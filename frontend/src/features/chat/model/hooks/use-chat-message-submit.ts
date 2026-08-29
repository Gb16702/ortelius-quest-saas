import type { NewMessageMessage } from "@ortelius/websocket-types"
import { type QueryClient, useQueryClient } from "@tanstack/react-query"
import { type Dispatch, type RefObject, useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { User } from "@/entities/session"
import { showErrorToast } from "@/shared/ui/toasts"
import { fetchChatMessagesPage } from "../../api/chat.api"
import { createConfirmedTextMessage, sendChatMessage } from "../../api/chat.mutations"
import { uploadChatAttachments } from "../../api/chat-attachments.api"
import { appendMessageToCachedFirstMessagePages } from "../../api/chat-message-page.cache"
import {
    applyNewMessageToConversation,
    updateCachedConversationFeeds,
    updateCachedInitialConversationPages,
} from "../../api/conversation-feed.cache"
import type { MentionData } from "../../ui/message-input"
import type { Attachment, MessageData } from "../chat"
import type { ChatAction, ReplyingTo } from "../chat.reducer"
import { useMessageBroadcast } from "./use-message-broadcast"

type BroadcastMessage = ReturnType<typeof useMessageBroadcast>["broadcastMessage"]

interface UseChatMessageSubmitOptions {
    conversationId: string | undefined
    scope: string
    selectedFiles: File[]
    isSubmitting: boolean
    currentUser: User | null | undefined
    replyingTo: ReplyingTo | null
    dispatch: Dispatch<ChatAction>
    highlightedMessageRef: RefObject<HTMLElement | null>
    messageInputRef: RefObject<HTMLTextAreaElement | null>
}

interface SendSubmittedMessageOptions {
    conversationId: string
    scope: string
    message: string
    mentions: MentionData[] | undefined
    attachments: Attachment[]
    currentUser: User
    replyingTo: ReplyingTo | null
    queryClient: QueryClient
    dispatch: Dispatch<ChatAction>
    broadcastMessage: BroadcastMessage
}

function normalizeUploadedAttachment(attachment: Attachment): Attachment {
    return {
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        size: attachment.size,
        mimeType: attachment.mimeType,
        s3Key: attachment.s3Key,
        url: attachment.url,
        downloadUrl: attachment.downloadUrl,
        uploadedAt: attachment.uploadedAt,
        uploadedBy: attachment.uploadedBy,
    }
}

function buildMessageMetadata(
    attachments: Attachment[],
    mentions: MentionData[] | undefined
): MessageData["metadata"] | undefined {
    const hasAttachments = attachments.length > 0
    const hasMentions = mentions && mentions.length > 0

    if (!hasAttachments && !hasMentions) return undefined

    return {
        ...(hasAttachments && { attachments }),
        ...(hasMentions && { mentions }),
    }
}

function hasAttachmentUrlGaps(messageData: MessageData): boolean {
    const attachments = messageData.metadata?.attachments
    return Boolean(attachments?.some((attachment) => !attachment.url || !attachment.downloadUrl))
}

async function rehydrateAttachmentUrls(
    conversationId: string,
    messageData: MessageData
): Promise<MessageData> {
    if (!hasAttachmentUrlGaps(messageData)) return messageData

    try {
        const messagesPage = await fetchChatMessagesPage({ conversationId, offset: 0 })
        return (
            messagesPage.data.messages.find((candidate) => candidate.id === messageData.id) ??
            messageData
        )
    } catch (error) {
        console.error("Failed to rehydrate message attachment URLs:", error)
        return messageData
    }
}

async function uploadSelectedAttachments(
    selectedFiles: File[],
    conversationId: string,
    t: (key: string, options?: Record<string, unknown>) => string
): Promise<Attachment[] | null> {
    if (selectedFiles.length === 0) return []

    const uploadResult = await uploadChatAttachments(selectedFiles, conversationId)

    if (!uploadResult.success) {
        const translatedError = uploadResult.errorKey
            ? t(`attachmentUpload.${uploadResult.errorKey}`, uploadResult.errorParams)
            : null
        showErrorToast(translatedError || uploadResult.error || t("attachmentUpload.uploadFailed"))
        return null
    }

    return uploadResult.attachments?.map(normalizeUploadedAttachment) ?? []
}

function flashReplyTarget(highlightedMessageRef: RefObject<HTMLElement | null>) {
    if (!highlightedMessageRef.current) return

    highlightedMessageRef.current.classList.remove("message-reply-highlight")
    highlightedMessageRef.current.classList.add("message-highlight")
    setTimeout(() => {
        if (highlightedMessageRef.current) {
            highlightedMessageRef.current.classList.remove("message-highlight")
            highlightedMessageRef.current = null
        }
    }, 5000)
}

async function sendSubmittedMessage({
    conversationId,
    scope,
    message,
    mentions,
    attachments,
    currentUser,
    replyingTo,
    queryClient,
    dispatch,
    broadcastMessage,
}: SendSubmittedMessageOptions) {
    const messageData = await sendChatMessage({
        conversationId,
        content: message.trim() || " ",
        replyToId: replyingTo?.messageId,
        metadata: buildMessageMetadata(attachments, mentions),
    })
    const renderableMessageData = await rehydrateAttachmentUrls(conversationId, messageData)

    const confirmedMessage = createConfirmedTextMessage({
        messageData: renderableMessageData,
        fallbackContent: message,
        currentUser: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image ?? null,
        },
    })

    dispatch({ type: "ADD_MESSAGE", message: confirmedMessage })

    const broadcastPayload: NewMessageMessage = {
        type: "message:new",
        conversationId,
        data: {
            id: confirmedMessage.id,
            content: confirmedMessage.content,
            senderId: confirmedMessage.senderId,
            senderName: currentUser.name,
            senderImage: currentUser.image,
            organizationName: confirmedMessage.organizationName,
            memberRole: confirmedMessage.memberRole,
            replyTo: confirmedMessage.replyTo,
            createdAt: confirmedMessage.createdAt,
            updatedAt: confirmedMessage.updatedAt,
            metadata: confirmedMessage.metadata,
        },
        timestamp: new Date().toISOString(),
    }

    appendMessageToCachedFirstMessagePages(
        queryClient,
        {
            userId: currentUser.id,
            scope,
            conversationId,
        },
        confirmedMessage
    )
    updateCachedConversationFeeds(
        queryClient,
        { userId: currentUser.id, scope },
        (conversation) =>
            applyNewMessageToConversation(conversation, broadcastPayload, currentUser.id),
        { shouldSort: true, invalidateOnMiss: true }
    )
    updateCachedInitialConversationPages(
        queryClient,
        { userId: currentUser.id, scope },
        (conversation) =>
            applyNewMessageToConversation(conversation, broadcastPayload, currentUser.id),
        { shouldSort: true, invalidateOnMiss: true }
    )

    broadcastMessage(broadcastPayload)
}

export function useChatMessageSubmit({
    conversationId,
    scope,
    selectedFiles,
    isSubmitting,
    currentUser,
    replyingTo,
    dispatch,
    highlightedMessageRef,
    messageInputRef,
}: UseChatMessageSubmitOptions): (message: string, mentions?: MentionData[]) => Promise<boolean> {
    const { t } = useTranslation("chat")
    const { broadcastMessage } = useMessageBroadcast()
    const queryClient = useQueryClient()

    return useCallback(
        async (message: string, mentions?: MentionData[]) => {
            if (
                (!message.trim() && selectedFiles.length === 0) ||
                isSubmitting ||
                !currentUser ||
                !conversationId
            ) {
                return false
            }

            dispatch({ type: "SET_SUBMITTING", submitting: true })
            dispatch({ type: "SET_UPLOADING_FILES", uploading: true })

            try {
                const uploadedAttachments = await uploadSelectedAttachments(
                    selectedFiles,
                    conversationId,
                    t
                )
                if (!uploadedAttachments) return false

                dispatch({ type: "SET_UPLOADING_FILES", uploading: false })

                await sendSubmittedMessage({
                    conversationId,
                    scope,
                    message,
                    mentions,
                    attachments: uploadedAttachments,
                    currentUser,
                    replyingTo,
                    queryClient,
                    dispatch,
                    broadcastMessage,
                })

                dispatch({ type: "CLEAR_SELECTED_FILES" })
                dispatch({ type: "CLEAR_REPLYING_TO" })
                flashReplyTarget(highlightedMessageRef)
                return true
            } catch (error) {
                console.error("Error sending message:", error)
                showErrorToast(t("toast.sendMessageFailed"))
                return false
            } finally {
                dispatch({ type: "SET_SUBMITTING", submitting: false })
                dispatch({ type: "SET_UPLOADING_FILES", uploading: false })
                requestAnimationFrame(() => {
                    messageInputRef.current?.focus()
                })
            }
        },
        [
            selectedFiles,
            isSubmitting,
            currentUser,
            conversationId,
            scope,
            replyingTo,
            queryClient,
            dispatch,
            highlightedMessageRef,
            messageInputRef,
            broadcastMessage,
            t,
        ]
    )
}
