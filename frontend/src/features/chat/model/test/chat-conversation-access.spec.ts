import { describe, expect, it } from "bun:test"
import { ApiError } from "@/shared/api/http.response"
import { getChatConversationLoadState } from "../chat-conversation-access"

function buildApiError(status: number) {
    return new ApiError({
        status,
        code: status === 403 ? "FORBIDDEN" : "NOT_FOUND",
        message: status === 403 ? "Access denied" : "Conversation not found",
    })
}

describe("chat conversation access state", () => {
    it("classifies 403 message query failures as forbidden without read access", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: false,
            hasConversationsData: true,
            isLoading: false,
            messagesError: buildApiError(403),
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "forbidden",
            canReadConversation: false,
        })
    })

    it("classifies 404 message query failures as not found without read access", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: false,
            hasConversationsData: true,
            isLoading: false,
            messagesError: buildApiError(404),
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "not-found",
            canReadConversation: false,
        })
    })

    it("keeps read access once the messages query has data", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: true,
            hasConversationsData: false,
            isLoading: true,
            messagesError: null,
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "loading",
            canReadConversation: true,
        })
    })

    it("does not keep stale read access after an access failure", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: true,
            hasConversationsData: true,
            isLoading: false,
            messagesError: buildApiError(403),
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "forbidden",
            canReadConversation: false,
        })
    })

    it("short-circuits to loading when required inputs are missing, ignoring other signals", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: false,
            hasMessagesData: true,
            hasConversationsData: true,
            isLoading: false,
            messagesError: buildApiError(403),
            conversationsError: buildApiError(404),
        })

        expect(state).toEqual({
            status: "loading",
            canReadConversation: false,
        })
    })

    it("reports ready with read access when both queries have data and no errors", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: true,
            hasConversationsData: true,
            isLoading: false,
            messagesError: null,
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "ready",
            canReadConversation: true,
        })
    })

    it("classifies 403 conversations query failures as forbidden even when messages error is null", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: false,
            hasConversationsData: false,
            isLoading: false,
            messagesError: null,
            conversationsError: buildApiError(403),
        })

        expect(state).toEqual({
            status: "forbidden",
            canReadConversation: false,
        })
    })

    it("falls through to error when a messages error is not 403 or 404", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: false,
            hasConversationsData: true,
            isLoading: false,
            messagesError: buildApiError(500),
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "error",
            canReadConversation: false,
        })
    })

    it("treats non-ApiError failures as generic errors when not loading and missing data", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: false,
            hasConversationsData: false,
            isLoading: false,
            messagesError: new Error("network"),
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "error",
            canReadConversation: false,
        })
    })

    it("falls back to loading when nothing has resolved and no errors are present", () => {
        const state = getChatConversationLoadState({
            hasRequiredInputs: true,
            hasMessagesData: false,
            hasConversationsData: false,
            isLoading: false,
            messagesError: null,
            conversationsError: null,
        })

        expect(state).toEqual({
            status: "loading",
            canReadConversation: false,
        })
    })
})
