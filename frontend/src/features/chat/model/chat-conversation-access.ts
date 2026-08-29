import { ApiError } from "@/shared/api/http.response"

export type ChatConversationLoadStatus = "loading" | "ready" | "forbidden" | "not-found" | "error"

export interface ChatConversationLoadState {
    status: ChatConversationLoadStatus
    canReadConversation: boolean
}

interface GetChatConversationLoadStateOptions {
    hasRequiredInputs: boolean
    hasMessagesData: boolean
    hasConversationsData: boolean
    isLoading: boolean
    messagesError: unknown
    conversationsError: unknown
}

export function getChatConversationLoadState({
    hasRequiredInputs,
    hasMessagesData,
    hasConversationsData,
    isLoading,
    messagesError,
    conversationsError,
}: GetChatConversationLoadStateOptions): ChatConversationLoadState {
    if (!hasRequiredInputs) {
        return { status: "loading", canReadConversation: false }
    }

    const accessStatus =
        getChatConversationAccessErrorStatus(messagesError) ??
        getChatConversationAccessErrorStatus(conversationsError)

    if (accessStatus) {
        return { status: accessStatus, canReadConversation: false }
    }

    const canReadConversation = hasMessagesData

    if (hasMessagesData && hasConversationsData) {
        return { status: "ready", canReadConversation }
    }

    if (isLoading) {
        return { status: "loading", canReadConversation }
    }

    if (messagesError || conversationsError) {
        return { status: "error", canReadConversation }
    }

    return { status: "loading", canReadConversation }
}

export function getChatConversationAccessErrorStatus(
    error: unknown
): Extract<ChatConversationLoadStatus, "forbidden" | "not-found"> | null {
    if (!(error instanceof ApiError)) return null

    if (error.status === 403) return "forbidden"
    if (error.status === 404) return "not-found"

    return null
}
