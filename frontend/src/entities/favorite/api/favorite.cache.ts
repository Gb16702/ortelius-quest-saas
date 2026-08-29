import type { QueryClient } from "@tanstack/react-query"
import type { FavoriteGroup, FavoriteItem, FavoritesResponse } from "../model/favorite.schema"
import { favoriteKeys } from "./favorite.query-keys"

interface UpdateFavoriteQueryDataInput {
    organizationId: string | undefined
    favorite: FavoriteItem
    isFavorited: boolean
}

export function updateFavoritesData(
    data: FavoritesResponse["data"] | undefined,
    favorite: FavoriteItem,
    isFavorited: boolean
): FavoritesResponse["data"] {
    const favorites = data?.favorites ?? []
    const groups = data?.groups ?? []
    const withoutFavorite = favorites.filter(
        (item) => item.entityType !== favorite.entityType || item.entityId !== favorite.entityId
    )

    if (!isFavorited) {
        return { favorites: withoutFavorite, groups }
    }

    return {
        favorites: [favorite, ...withoutFavorite],
        groups,
    }
}

export function updateFavoriteQueryData(
    queryClient: QueryClient,
    { organizationId, favorite, isFavorited }: UpdateFavoriteQueryDataInput
) {
    if (!organizationId) return

    queryClient.setQueryData<FavoritesResponse["data"]>(
        favoriteKeys.list({ organizationId }),
        (data) => updateFavoritesData(data, favorite, isFavorited)
    )
}

export function upsertFavoriteGroupData(
    data: FavoritesResponse["data"] | undefined,
    group: FavoriteGroup
): FavoritesResponse["data"] {
    const favorites = data?.favorites ?? []
    const groups = data?.groups ?? []
    const nextGroups = [group, ...groups.filter((item) => item.id !== group.id)].sort(
        (a, b) => a.position - b.position
    )

    return { favorites, groups: nextGroups }
}

export function removeFavoriteGroupData(
    data: FavoritesResponse["data"] | undefined,
    groupId: string
): FavoritesResponse["data"] {
    return {
        groups: (data?.groups ?? []).filter((group) => group.id !== groupId),
        favorites: (data?.favorites ?? []).filter((favorite) => favorite.groupId !== groupId),
    }
}

export function updateFavoritePlacementsData(
    data: FavoritesResponse["data"] | undefined,
    placements: Array<Pick<FavoriteItem, "entityType" | "entityId" | "groupId" | "position">>,
    groups: Array<Pick<FavoriteGroup, "id" | "position">> = []
): FavoritesResponse["data"] {
    const placementByIdentity = new Map(
        placements.map((placement) => [`${placement.entityType}:${placement.entityId}`, placement])
    )
    const groupPositionById = new Map(groups.map((group) => [group.id, group.position]))

    return {
        favorites: (data?.favorites ?? [])
            .map((favorite) => {
                const placement = placementByIdentity.get(
                    `${favorite.entityType}:${favorite.entityId}`
                )

                if (!placement) return favorite
                return {
                    ...favorite,
                    groupId: placement.groupId,
                    position: placement.position,
                }
            })
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        groups: (data?.groups ?? [])
            .map((group) => {
                const position = groupPositionById.get(group.id)
                return typeof position === "number" ? { ...group, position } : group
            })
            .sort((a, b) => a.position - b.position),
    }
}
