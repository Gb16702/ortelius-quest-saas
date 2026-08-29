import {
    createApiError,
    parseEmptySuccessResponse,
    readJsonResponse,
} from "@/shared/api/http.response"

export async function deleteAssistantConversation(conversationId: string): Promise<void> {
    const conversationPath = `/api/assistant/conversations/${encodeURIComponent(conversationId)}`
    const response = await fetch(conversationPath, {
        method: "DELETE",
        credentials: "include",
    })

    if (response.ok) {
        await parseEmptySuccessResponse(response, "Failed to delete assistant conversation")
        return
    }

    const payload = await readJsonResponse(response)

    throw createApiError(response.status, payload, "Failed to delete assistant conversation")
}
