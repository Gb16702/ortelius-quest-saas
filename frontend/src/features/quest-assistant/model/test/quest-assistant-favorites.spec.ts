import { describe, expect, it } from "bun:test"
import type { FavoritesResponse } from "@/entities/favorite"
import { removeAssistantConversationFavorite } from "../quest-assistant-favorites"

describe("removeAssistantConversationFavorite", () => {
    it("removes only the favorite linked to the deleted assistant conversation", () => {
        const favorites = {
            groups: [],
            favorites: [
                {
                    id: "favorite-assistant-1",
                    entityType: "assistant_conversation",
                    entityId: "conversation-1",
                    organizationId: "org-1",
                    label: "Deleted assistant chat",
                    subtitle: "AI chat",
                    createdAt: "2026-06-11T12:00:00.000Z",
                    meta: {},
                },
                {
                    id: "favorite-assistant-2",
                    entityType: "assistant_conversation",
                    entityId: "conversation-2",
                    organizationId: "org-1",
                    label: "Other assistant chat",
                    subtitle: "AI chat",
                    createdAt: "2026-06-11T12:00:00.000Z",
                    meta: {},
                },
                {
                    id: "favorite-request-1",
                    entityType: "request",
                    entityId: "conversation-1",
                    organizationId: "org-1",
                    label: "Request with same id",
                    subtitle: "Request",
                    createdAt: "2026-06-11T12:00:00.000Z",
                    meta: {},
                },
            ],
        } satisfies FavoritesResponse["data"]

        expect(removeAssistantConversationFavorite(favorites, "conversation-1")).toEqual({
            groups: [],
            favorites: [favorites.favorites[1], favorites.favorites[2]],
        })
    })
})
