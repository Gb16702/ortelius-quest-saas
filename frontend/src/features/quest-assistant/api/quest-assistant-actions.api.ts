import { parseJsonResponse } from "@/shared/api/http.response"
import type { AssistantAction } from "../model/quest-assistant"
import { assistantActionResponseSchema } from "../model/quest-assistant.schema"

export async function confirmAssistantAction(actionId: string): Promise<AssistantAction> {
    const response = await fetch(`/api/assistant/actions/${actionId}/confirm`, {
        method: "POST",
        credentials: "include",
    })
    const payload = await parseJsonResponse(
        response,
        assistantActionResponseSchema,
        "Failed to confirm assistant action"
    )

    return payload.data.action
}

export async function cancelAssistantAction(actionId: string): Promise<AssistantAction> {
    const response = await fetch(`/api/assistant/actions/${actionId}/cancel`, {
        method: "POST",
        credentials: "include",
    })
    const payload = await parseJsonResponse(
        response,
        assistantActionResponseSchema,
        "Failed to cancel assistant action"
    )

    return payload.data.action
}
