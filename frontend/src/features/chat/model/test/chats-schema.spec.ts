import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    chatMessageMutationResponseSchema,
    conversationsListResponseSchema,
} from "../schemas/chats.schema"

const baseConversation = {
    id: "conversation-1",
    name: "Operations",
    lastMessage: null,
    updatedAt: "2026-05-11T00:00:00.000Z",
}

function buildConversationsPayload(conversation: Record<string, unknown>) {
    return {
        success: true,
        data: {
            conversations: [conversation],
            pagination: {
                total: 1,
                limit: 20,
                offset: 0,
                hasMore: false,
            },
        },
    }
}

describe("conversation schema", () => {
    it("requires an organization id for team chat conversations", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload({
                ...baseConversation,
                isTeamChat: true,
            })
        )

        expect(result.success).toBe(false)
    })

    it("accepts team chat conversations with an organization id", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload({
                ...baseConversation,
                isTeamChat: true,
                organizationId: "org-123",
            })
        )

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.data.conversations[0].organizationId).toBe("org-123")
        expect(result.data.data.conversations[0].conversationType).toBe("team")
        expect(result.data.data.conversations[0].isTeamChat).toBe(true)
    })

    it("accepts requester conversations with an explicit false team-chat flag", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload({
                ...baseConversation,
                isTeamChat: false,
            })
        )

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.data.conversations[0].isTeamChat).toBe(false)
        expect(result.data.data.conversations[0].conversationType).toBe("requester")
    })

    it("accepts requester conversations with an explicit conversation type", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload({
                ...baseConversation,
                conversationType: "requester",
            })
        )

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.data.conversations[0].conversationType).toBe("requester")
        expect(result.data.data.conversations[0].isTeamChat).toBe(false)
    })

    it("accepts member DM conversations with an explicit conversation type", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload({
                ...baseConversation,
                conversationType: "member_dm",
            })
        )

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.data.conversations[0].conversationType).toBe("member_dm")
        expect(result.data.data.conversations[0].isTeamChat).toBe(false)
    })

    it("rejects conflicting conversation taxonomy fields", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload({
                ...baseConversation,
                conversationType: "requester",
                isTeamChat: true,
                organizationId: "org-123",
            })
        )

        expect(result.success).toBe(false)
    })

    it("requires an explicit team-chat flag", () => {
        const result = safeParseSchema(
            conversationsListResponseSchema,
            buildConversationsPayload(baseConversation)
        )

        expect(result.success).toBe(false)
    })
})

describe("chat mutation response schema", () => {
    it("requires message data for successful message mutations", () => {
        const result = safeParseSchema(chatMessageMutationResponseSchema, {
            success: true,
            data: {
                id: "message-1",
                content: "Dock slot confirmed",
                messageType: "text",
                senderId: "user-1",
                senderName: "Ada",
                senderImage: null,
                organizationName: "Ortelius",
                memberRole: "admin",
                replyTo: null,
                isEdited: false,
                isDeleted: false,
                createdAt: "2026-05-11T00:00:00.000Z",
            },
        })

        expect(result.success).toBe(true)
    })

    it("rejects ambiguous message mutation responses", () => {
        expect(safeParseSchema(chatMessageMutationResponseSchema, {}).success).toBe(false)
        expect(safeParseSchema(chatMessageMutationResponseSchema, { success: false }).success).toBe(
            false
        )
        expect(
            safeParseSchema(chatMessageMutationResponseSchema, {
                success: true,
                message: "Message sent successfully",
            }).success
        ).toBe(false)
    })
})
