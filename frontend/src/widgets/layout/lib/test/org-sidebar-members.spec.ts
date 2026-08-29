import { describe, expect, it } from "bun:test"
import type { OrganizationMember } from "@/entities/member"
import type { Conversation } from "@/features/chat"
import { selectSidebarMembers } from "../org-sidebar-members"

const currentUserId = "user-current"

function member(id: string, name: string, lastSeenAt: string | null): OrganizationMember {
    return {
        id: `membership-${id}`,
        role: "member",
        createdAt: "2026-05-01T00:00:00.000Z",
        lastSeenAt,
        user: {
            id,
            name,
            email: `${id}@example.test`,
            image: null,
            twoFactorEnabled: false,
        },
    }
}

function memberDm({
    id,
    userId,
    updatedAt,
    isUnread = false,
}: {
    id: string
    userId: string
    updatedAt: string
    isUnread?: boolean
}): Conversation {
    return {
        id,
        name: userId,
        conversationType: "member_dm",
        isTeamChat: false,
        organizationId: "org-1",
        lastMessage: {
            id: `message-${id}`,
            content: "Hello",
            senderId: userId,
            senderName: userId,
            createdAt: updatedAt,
            isUnread,
        },
        messageCount: 1,
        participants: [],
        updatedAt,
        contextInfo: {
            type: "user",
            id: userId,
            name: userId,
            image: null,
            email: `${userId}@example.test`,
        },
        isPinned: false,
        pinnedAt: null,
    }
}

describe("selectSidebarMembers", () => {
    it("orders unread member DMs before recent DMs and active member fallback", () => {
        const result = selectSidebarMembers({
            currentUserId,
            members: [
                member(currentUserId, "Current User", "2026-05-27T12:00:00.000Z"),
                member("user-active", "Active Fallback", "2026-05-27T11:00:00.000Z"),
                member("user-recent", "Recent DM", "2026-05-01T00:00:00.000Z"),
                member("user-unread", "Unread DM", "2026-05-01T00:00:00.000Z"),
            ],
            conversations: [
                memberDm({
                    id: "conversation-recent",
                    userId: "user-recent",
                    updatedAt: "2026-05-27T10:00:00.000Z",
                }),
                memberDm({
                    id: "conversation-unread",
                    userId: "user-unread",
                    updatedAt: "2026-05-20T10:00:00.000Z",
                    isUnread: true,
                }),
            ],
        })

        expect(result.map((item) => item.member.user.id)).toEqual([
            "user-unread",
            "user-recent",
            "user-active",
        ])
        expect(result[0]?.conversation?.conversationId).toBe("conversation-unread")
    })

    it("limits the sidebar member list to five members", () => {
        const result = selectSidebarMembers({
            currentUserId,
            members: Array.from({ length: 7 }, (_, index) =>
                member(`user-${index}`, `User ${index}`, `2026-05-2${index}T00:00:00.000Z`)
            ),
            conversations: [],
        })

        expect(result).toHaveLength(5)
    })
})
