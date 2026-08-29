import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { favoritesResponseSchema } from "../favorite.schema"

describe("favoritesResponseSchema", () => {
    it("accepts heterogeneous favorite items from the API", () => {
        const result = safeParseSchema(favoritesResponseSchema, {
            success: true,
            data: {
                favorites: [
                    {
                        id: "fav-request-1",
                        entityType: "request",
                        entityId: "request-1",
                        organizationId: "org-1",
                        label: "REQ-0001",
                        subtitle: "Ada Lovelace",
                        createdAt: "2026-05-27T10:00:00.000Z",
                        meta: { requestNumber: "REQ-0001" },
                    },
                    {
                        id: "conversation:conversation-1",
                        entityType: "conversation",
                        entityId: "conversation-1",
                        organizationId: "org-1",
                        label: "Team chat",
                        subtitle: "Conversation",
                        createdAt: "2026-05-27T10:01:00.000Z",
                        meta: { conversationType: "team", isTeamChat: true },
                    },
                    {
                        id: "member:user-1",
                        entityType: "member",
                        entityId: "user-1",
                        organizationId: "org-1",
                        label: "Geoffrey Delhaye",
                        subtitle: "Member profile",
                        createdAt: "2026-05-27T10:02:00.000Z",
                        meta: { name: "Geoffrey Delhaye" },
                    },
                ],
            },
        })

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.data.favorites.map((favorite) => favorite.entityType)).toEqual([
                "request",
                "conversation",
                "member",
            ])
        }
    })

    it("rejects unknown favorite entity types", () => {
        const result = safeParseSchema(favoritesResponseSchema, {
            data: {
                favorites: [
                    {
                        id: "fav-1",
                        entityType: "unknown",
                        entityId: "entity-1",
                        organizationId: "org-1",
                        label: "Unknown",
                        createdAt: "2026-05-27T10:00:00.000Z",
                    },
                ],
            },
        })

        expect(result.success).toBe(false)
    })
})
