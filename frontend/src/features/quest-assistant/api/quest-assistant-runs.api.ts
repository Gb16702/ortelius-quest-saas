import { parseJsonResponse } from "@/shared/api/http.response"
import { assistantRunCancellationResponseSchema } from "../model/quest-assistant.schema"

interface CancelAssistantRunResult {
    conversationId: string
    runId: string
    status: "cancelled"
}

export async function cancelAssistantRun(runId: string): Promise<CancelAssistantRunResult> {
    const response = await fetch(`/api/assistant/runs/${encodeURIComponent(runId)}/cancel`, {
        method: "POST",
        credentials: "include",
    })
    const payload = await parseJsonResponse(
        response,
        assistantRunCancellationResponseSchema,
        "Failed to stop assistant generation"
    )

    return payload.data
}
