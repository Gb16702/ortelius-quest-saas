import * as v from "valibot"
import {
    createApiError,
    parseEmptySuccessResponse,
    readJsonResponse,
} from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { Attachment, MessageData } from "../model/chat"
import { chatMessageMutationResponseSchema } from "../model/schemas/chats.schema"

interface MentionPayload {
    type: "user" | "role"
    id: string
    name: string
}

interface SendChatMessageMetadata {
    attachments?: Attachment[]
    mentions?: MentionPayload[]
    requestId?: string
    requestNumber?: string
    type?: string
}

interface SendChatMessageOptions {
    conversationId: string
    content: string
    messageType?: "text" | "system"
    replyToId?: string
    metadata?: SendChatMessageMetadata
}

interface UpdateChatMessageOptions {
    messageId: string
    content: string
}

interface SetConversationPinnedStateOptions {
    conversationId: string
    isPinned: boolean
}

interface ResolveMemberDmConversationOptions {
    organizationId: string
    targetUserId: string
}

export interface ResolvedMemberDmConversation {
    conversationId: string
    conversationType: "member_dm"
}

interface ConfirmedTextMessageOptions {
    messageData: MessageData
    fallbackContent: string
    currentUser: {
        id: string
        name: string
        image: string | null
    }
}

const chatMutationErrorResponseSchema = v.looseObject({
    message: v.optional(v.string()),
})

const resolveMemberDmConversationResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        conversationId: v.string(),
        conversationType: v.literal("member_dm"),
    }),
})

export async function deleteChatMessage(messageId: string): Promise<void> {
    const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getChatMutationErrorMessage(json, "Failed to delete message"))
    }
}

export async function updateChatMessage({
    messageId,
    content,
}: UpdateChatMessageOptions): Promise<void> {
    const response = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getChatMutationErrorMessage(json, "Failed to update message"))
    }
}

export async function setConversationPinnedState({
    conversationId,
    isPinned,
}: SetConversationPinnedStateOptions): Promise<void> {
    const response = await fetch(`/api/conversations/${conversationId}/pin`, {
        method: isPinned ? "POST" : "DELETE",
        credentials: "include",
    })

    await parseEmptySuccessResponse(
        response,
        isPinned ? "Failed to pin conversation" : "Failed to unpin conversation"
    )
}

export async function resolveMemberDmConversation({
    organizationId,
    targetUserId,
}: ResolveMemberDmConversationOptions): Promise<ResolvedMemberDmConversation> {
    const response = await fetch("/api/conversations/resolve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "member_dm",
            organizationId,
            targetUserId,
        }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(response.status, json, "Failed to start member chat")
    }

    const parsed = safeParseSchema(resolveMemberDmConversationResponseSchema, json)
    if (!parsed.success) {
        console.error(
            "Invalid resolve member DM payload:",
            parsed.error.flatten((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }))
        )
        throw new Error("Server response invalid.")
    }

    return parsed.data.data
}

export async function sendChatMessage({
    conversationId,
    content,
    messageType = "text",
    replyToId,
    metadata,
}: SendChatMessageOptions): Promise<MessageData> {
    const response = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content,
            messageType,
            replyToId,
            metadata,
        }),
    })

    const json = await readJsonResponse(response)
    const parsed = safeParseSchema(chatMessageMutationResponseSchema, json)

    if (!response.ok) {
        throw new Error(getChatMutationErrorMessage(json, "Failed to send message"))
    }

    if (!parsed.success) {
        console.error(
            "Invalid send message payload:",
            parsed.error.flatten((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }))
        )
        throw new Error("Server response invalid.")
    }

    return parsed.data.data
}

export function createConfirmedTextMessage({
    messageData,
    fallbackContent,
    currentUser,
}: ConfirmedTextMessageOptions): MessageData {
    return {
        id: messageData.id,
        content: messageData.content || fallbackContent,
        messageType: "text",
        senderId: messageData.senderId || currentUser.id,
        senderName: currentUser.name,
        senderImage: currentUser.image,
        organizationName: messageData.organizationName,
        memberRole: messageData.memberRole,
        replyTo: messageData.replyTo || null,
        isEdited: false,
        isDeleted: false,
        createdAt: messageData.createdAt || new Date().toISOString(),
        updatedAt: messageData.updatedAt || new Date().toISOString(),
        metadata: messageData.metadata,
    }
}

function getChatMutationErrorMessage(payload: unknown, fallback: string): string {
    const parsed = v.safeParse(chatMutationErrorResponseSchema, payload)
    if (!parsed.success) return fallback
    return parsed.output.message || fallback
}
