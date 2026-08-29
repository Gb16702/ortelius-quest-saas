import { describe, expect, it } from "bun:test"
import type { FavoriteItem } from "../../model/favorite.schema"
import { updateFavoritesData } from "../favorite.cache"

const existingFavorite: FavoriteItem = {
    id: "favorite-request-1",
    entityType: "request",
    entityId: "request-1",
    organizationId: "org-1",
    label: "REQ-001",
    createdAt: "2026-05-28T10:00:00.000Z",
}

const optimisticFavorite: FavoriteItem = {
    id: "optimistic:conversation:conversation-1",
    entityType: "conversation",
    entityId: "conversation-1",
    organizationId: "org-1",
    label: "Team chat",
    createdAt: "2026-05-28T10:01:00.000Z",
    meta: { conversationType: "team", isTeamChat: true },
}

describe("updateFavoritesData", () => {
    it("adds an optimistic favorite at the top without duplicating an existing item", () => {
        const result = updateFavoritesData(
            { favorites: [existingFavorite, { ...optimisticFavorite, label: "Old label" }] },
            optimisticFavorite,
            true
        )

        expect(result.favorites).toEqual([optimisticFavorite, existingFavorite])
    })

    it("removes the matching favorite by entity identity", () => {
        const result = updateFavoritesData(
            { favorites: [existingFavorite, optimisticFavorite] },
            optimisticFavorite,
            false
        )

        expect(result.favorites).toEqual([existingFavorite])
    })
})
