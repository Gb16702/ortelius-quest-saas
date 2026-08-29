import { parseJsonResponse } from "@/shared/api/http.response"
import type { AssistantSyncAction } from "../model/quest-assistant"
import { assistantSyncResponseSchema } from "../model/quest-assistant.schema"

export interface FetchAssistantSyncResult {
    firstSyncId: number
    lastSyncId: number
    hasMore: boolean
    actions: AssistantSyncAction[]
}

export async function fetchAssistantSyncActions(input: {
    after: number
    limit?: number
}): Promise<FetchAssistantSyncResult> {
    const params = new URLSearchParams({
        after: String(input.after),
    })

    if (input.limit !== undefined) {
        params.set("limit", String(input.limit))
    }

    const response = await fetch(`/api/assistant/sync?${params}`, {
        credentials: "include",
    })
    const payload = await parseJsonResponse(
        response,
        assistantSyncResponseSchema,
        "Failed to sync assistant"
    )

    return payload.data
}
