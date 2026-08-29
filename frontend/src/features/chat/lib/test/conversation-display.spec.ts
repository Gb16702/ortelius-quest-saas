import { describe, expect, it } from "bun:test"
import type { Conversation } from "../../model/chat"
import {
    getConversationDisplayName,
    getConversationDisplayType,
    getConversationFavoriteDisplayMetadata,
    normalizeConversationDisplayName,
} from "../conversation-display"

function conversation(overrides: Partial<Conversation>): Conversation {
    return {
        id: "conversation-1",
        name: "Direct message with Geoffrey Delhaye",
        lastMessage: null,
        messageCount: 0,
        participants: [],
        updatedAt: "2026-05-28T10:00:00.000Z",
        contextInfo: null,
        isPinned: true,
        pinnedAt: "2026-05-28T10:00:00.000Z",
        conversationType: "requester",
        isTeamChat: false,
        ...overrides,
    } as Conversation
}

describe("conversation display", () => {
    it("removes direct-message prefixes from dynamic conversation names", () => {
        expect(normalizeConversationDisplayName("Direct message with Geoffrey Delhaye")).toBe(
            "Geoffrey Delhaye"
        )
    })

    it("uses requester display semantics for guest user conversations", () => {
        const target = conversation({
            conversationType: "member_dm",
            contextInfo: {
                type: "user",
                id: null,
                name: "Geoffrey Delhaye",
                image: null,
                email: "geoffrey@example.test",
            },
        })

        expect(getConversationDisplayType(target)).toBe("requester")
        expect(getConversationFavoriteDisplayMetadata(target)).toEqual({
            conversationType: "requester",
            isTeamChat: false,
            name: "Geoffrey Delhaye",
        })
    })

    it("uses organization context names for team chats", () => {
        expect(
            getConversationDisplayName(
                conversation({
                    name: "Team chat",
                    conversationType: "team",
                    isTeamChat: true,
                    organizationId: "org-1",
                    contextInfo: {
                        type: "organization",
                        id: "org-1",
                        name: "Test org",
                        logo: null,
                    },
                })
            )
        ).toBe("Test org")
    })
})
