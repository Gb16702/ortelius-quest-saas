import { createApiError, readJsonResponse } from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { AssistantRuntimeContext } from "../model/quest-assistant"
import { assistantMessageCommandResponseSchema } from "../model/quest-assistant.schema"

interface SendAssistantMessageInput {
    conversationId?: string
    userMessageId?: string
    assistantMessageId?: string
    message: string
    attachmentIds?: string[]
    context?: AssistantRuntimeContext
}

interface SendAssistantMessageResult {
    conversationId: string
    userMessageId: string
    assistantMessageId: string
    runId: string
    lastSyncId: number
}

export async function sendAssistantMessage({
    conversationId,
    userMessageId,
    assistantMessageId,
    message,
    attachmentIds,
    context,
}: SendAssistantMessageInput): Promise<SendAssistantMessageResult> {
    const response = await fetch("/api/assistant/messages", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ...(conversationId ? { conversationId } : {}),
            ...(userMessageId ? { userMessageId } : {}),
            ...(assistantMessageId ? { assistantMessageId } : {}),
            message,
            ...(attachmentIds && attachmentIds.length > 0 ? { attachmentIds } : {}),
            ...(context ? { context } : {}),
        }),
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(response.status, payload, "Failed to send assistant message")
    }

    const parsed = safeParseSchema(assistantMessageCommandResponseSchema, payload)
    if (!parsed.success) {
        throw new Error("Assistant command response is invalid")
    }

    return parsed.data.data
}
