import { describe, expect, it } from "bun:test"
import type { FavoriteItem } from "@/entities/favorite"
import type { Conversation } from "@/features/chat"
import { getFavoriteDisplayLabel } from "../org-sidebar-favorite-display"

const organizationName = "Test org"
const t = (_key: string, options: Record<string, unknown>) => {
    if (typeof options.requestNumber === "string") {
        return `Request chat #${options.requestNumber} with ${String(options.name)}`
    }

    return `Request chat with ${String(options.name)}`
}

function favorite(overrides: Partial<FavoriteItem>): FavoriteItem {
    return {
        id: "favorite-1",
        entityType: "conversation",
        entityId: "conversation-1",
        organizationId: "org-1",
        label: "Team chat",
        createdAt: "2026-05-28T10:00:00.000Z",
        ...overrides,
    }
}

function conversation(overrides: Partial<Conversation>): Conversation {
    return {
        id: "conversation-1",
        name: "Geoffrey Delhaye",
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

describe("getFavoriteDisplayLabel", () => {
    it("uses the organization name for generic team chat favorites after refresh", () => {
        expect(
            getFavoriteDisplayLabel({
                favorite: favorite({ meta: { isTeamChat: true } }),
                organizationName,
                t,
            })
        ).toBe(organizationName)
    })

    it("uses the cached conversation type for requester chat favorites after refresh", () => {
        expect(
            getFavoriteDisplayLabel({
                favorite: favorite({ label: "Direct message with Geoffrey Delhaye" }),
                conversation: conversation({
                    name: "Direct message with Geoffrey Delhaye",
                    conversationType: "requester",
                    isTeamChat: false,
                }),
                organizationName,
                t,
            })
        ).toBe("Request chat with Geoffrey Delhaye")
    })

    it("does not render direct-message wording from requester metadata", () => {
        expect(
            getFavoriteDisplayLabel({
                favorite: favorite({
                    label: "Direct message with Geoffrey Delhaye",
                    meta: {
                        conversationType: "requester",
                        requesterName: "Direct message with Geoffrey Delhaye",
                    },
                }),
                organizationName,
                t,
            })
        ).toBe("Request chat with Geoffrey Delhaye")
    })

    it("treats guest user conversations as requester chats even when the API typed them as DMs", () => {
        expect(
            getFavoriteDisplayLabel({
                favorite: favorite({ label: "Geoffrey Delhaye" }),
                conversation: conversation({
                    conversationType: "member_dm",
                    isTeamChat: false,
                    contextInfo: {
                        type: "user",
                        id: null,
                        name: "Geoffrey Delhaye",
                        image: null,
                        email: "geoffrey@example.test",
                    },
                }),
                organizationName,
                t,
            })
        ).toBe("Request chat with Geoffrey Delhaye")
    })

    it("keeps member DM favorites as the member name", () => {
        expect(
            getFavoriteDisplayLabel({
                favorite: favorite({ label: "Geoffrey Delhaye" }),
                conversation: conversation({ conversationType: "member_dm", isTeamChat: false }),
                organizationName,
                t,
            })
        ).toBe("Geoffrey Delhaye")
    })
})
