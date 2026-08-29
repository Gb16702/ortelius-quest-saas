import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createApiError, parseJsonResponse, readJsonResponse } from "@/shared/api/http.response"
import { getErrorMessage } from "@/shared/lib/error"
import { generateUUID } from "@/shared/lib/uuid"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    showErrorToast,
    showPendingToast,
    showSuccessToast,
    showUndoToast,
} from "@/shared/ui/toasts"
import type {
    FavoriteEntityType,
    FavoriteGroup,
    FavoriteItem,
    FavoritesResponse,
} from "../model/favorite.schema"
import {
    favoriteGroupMutationResponseSchema,
    favoriteMutationResponseSchema,
    favoritesResponseSchema,
} from "../model/favorite.schema"
import { mergeFavoritesConversationDisplayMetadata } from "../model/favorite-conversation-display"
import {
    removeFavoriteGroupData,
    updateFavoritePlacementsData,
    updateFavoriteQueryData,
    upsertFavoriteGroupData,
} from "./favorite.cache"
import { favoriteKeys } from "./favorite.query-keys"

interface FavoriteListParams {
    organizationId?: string
}

interface ToggleFavoriteInput {
    entityType: FavoriteEntityType
    entityId: string
    isFavorited: boolean
    organizationId?: string
    optimisticFavorite?: FavoriteItem
}

interface FavoriteGroupCreateInput {
    organizationId: string
    name: string
    showToast?: boolean
}

interface FavoriteGroupRenameInput {
    organizationId: string
    groupId: string
    name: string
}

interface FavoriteGroupDeleteInput {
    organizationId: string
    groupId: string
}

export interface FavoritePlacementUpdate {
    entityType: FavoriteEntityType
    entityId: string
    groupId: string | null
    position: number
}

export interface FavoriteGroupPositionUpdate {
    id: string
    position: number
}

interface FavoriteReorderInput {
    organizationId: string
    items: FavoritePlacementUpdate[]
    groups?: FavoriteGroupPositionUpdate[]
}

function getFavoriteToggleToastId({
    entityType,
    entityId,
}: Pick<ToggleFavoriteInput, "entityType" | "entityId">): string {
    return `favorite-toggle:${entityType}:${entityId}`
}

export async function fetchFavorites({
    organizationId,
}: FavoriteListParams): Promise<FavoritesResponse["data"]> {
    const params = new URLSearchParams()
    if (organizationId) params.set("organizationId", organizationId)

    const response = await fetch(`/api/favorites${params.size ? `?${params}` : ""}`, {
        credentials: "include",
    })

    const parsed = await parseJsonResponse(
        response,
        favoritesResponseSchema,
        "Failed to load favorites"
    )

    return {
        favorites: mergeFavoritesConversationDisplayMetadata(parsed.data.favorites),
        groups: parsed.data.groups,
    }
}

export async function setFavorite({
    entityType,
    entityId,
    isFavorited,
    organizationId,
}: ToggleFavoriteInput): Promise<FavoriteItem | null> {
    const response = await fetch("/api/favorites", {
        method: isFavorited ? "DELETE" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, organizationId }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(
            response.status,
            json,
            isFavorited ? "Failed to remove favorite" : "Failed to add favorite"
        )
    }

    if (isFavorited) return null

    return parseSchema(favoriteMutationResponseSchema, json).data.favorite
}

export async function createFavoriteGroup({
    organizationId,
    name,
}: FavoriteGroupCreateInput): Promise<FavoriteGroup> {
    const response = await fetch("/api/favorites/groups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, name }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(response.status, json, "Failed to create favorite group")
    }

    return parseSchema(favoriteGroupMutationResponseSchema, json).data.group
}

export async function renameFavoriteGroup({
    organizationId,
    groupId,
    name,
}: FavoriteGroupRenameInput): Promise<FavoriteGroup> {
    const response = await fetch(`/api/favorites/groups/${encodeURIComponent(groupId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, name }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(response.status, json, "Failed to rename favorite group")
    }

    return parseSchema(favoriteGroupMutationResponseSchema, json).data.group
}

export async function deleteFavoriteGroup({
    organizationId,
    groupId,
}: FavoriteGroupDeleteInput): Promise<void> {
    const response = await fetch(`/api/favorites/groups/${encodeURIComponent(groupId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(response.status, json, "Failed to remove favorite group")
    }
}

export async function reorderFavorites({
    organizationId,
    items,
    groups,
}: FavoriteReorderInput): Promise<void> {
    const response = await fetch("/api/favorites/order", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, items, groups }),
    })

    const json = await readJsonResponse(response)
    if (!response.ok) {
        throw createApiError(response.status, json, "Failed to update favorites order")
    }
}

export function favoritesQueryOptions(organizationId?: string) {
    return queryOptions({
        queryKey: favoriteKeys.list({ organizationId }),
        queryFn: () => fetchFavorites({ organizationId }),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    })
}

export function useFavorites(organizationId?: string) {
    return useQuery({
        ...favoritesQueryOptions(organizationId),
        enabled: Boolean(organizationId),
    })
}

export function useFavoriteToggle() {
    const queryClient = useQueryClient()

    const undoFavoriteAddition = ({
        favorite,
        organizationId,
    }: {
        favorite: FavoriteItem
        organizationId: string
    }) => {
        const toastId = getFavoriteToggleToastId(favorite)

        updateFavoriteQueryData(queryClient, {
            organizationId,
            favorite,
            isFavorited: false,
        })
        const pendingId = showPendingToast("Removing favorite", { id: toastId })

        void setFavorite({
            entityType: favorite.entityType,
            entityId: favorite.entityId,
            isFavorited: true,
            organizationId,
            optimisticFavorite: favorite,
        }).then(
            () => {
                showSuccessToast("Favorite removed", { id: pendingId })
                void queryClient.invalidateQueries({
                    queryKey: favoriteKeys.all,
                    refetchType: "none",
                })
            },
            (error: unknown) => {
                updateFavoriteQueryData(queryClient, {
                    organizationId,
                    favorite,
                    isFavorited: true,
                })
                showErrorToast(getErrorMessage(error, "Failed to remove favorite"), {
                    id: pendingId,
                })
            }
        )
    }

    return useMutation({
        mutationFn: setFavorite,
        onMutate: async ({
            organizationId,
            optimisticFavorite,
            entityType,
            entityId,
            isFavorited,
        }) => {
            if (!organizationId) return

            const toastId = showPendingToast(
                isFavorited ? "Removing favorite" : "Adding favorite",
                {
                    id: getFavoriteToggleToastId({ entityType, entityId }),
                }
            )

            await queryClient.cancelQueries({
                queryKey: favoriteKeys.list({ organizationId }),
            })

            const queryKey = favoriteKeys.list({ organizationId })
            const previousFavorites = queryClient.getQueryData<FavoritesResponse["data"]>(queryKey)
            const favorite =
                optimisticFavorite ??
                previousFavorites?.favorites.find(
                    (item) => item.entityType === entityType && item.entityId === entityId
                )

            if (favorite) {
                updateFavoriteQueryData(queryClient, {
                    organizationId,
                    favorite,
                    isFavorited: !isFavorited,
                })
            }

            return { organizationId, previousFavorites, toastId }
        },
        onError: (_error, _variables, context) => {
            if (!context?.organizationId) return

            queryClient.setQueryData(
                favoriteKeys.list({ organizationId: context.organizationId }),
                context.previousFavorites
            )
            showErrorToast(getErrorMessage(_error, "Failed to update favorite"), {
                id: context.toastId,
            })
        },
        onSuccess: (favorite, variables, context) => {
            if (variables.isFavorited) {
                showSuccessToast("Favorite removed", { id: context?.toastId })
                return
            }

            if (!favorite || !variables.organizationId) {
                showSuccessToast("Favorite added", { id: context?.toastId })
                return
            }

            const organizationId = variables.organizationId
            updateFavoriteQueryData(queryClient, {
                organizationId,
                favorite,
                isFavorited: true,
            })
            showUndoToast(
                "Favorite added",
                {
                    onUndo: () => {
                        undoFavoriteAddition({
                            favorite,
                            organizationId,
                        })
                    },
                },
                { id: context?.toastId }
            )
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: favoriteKeys.all, refetchType: "none" })
        },
    })
}

export function useCreateFavoriteGroup() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createFavoriteGroup,
        onMutate: async ({ organizationId, name }) => {
            await queryClient.cancelQueries({ queryKey: favoriteKeys.list({ organizationId }) })

            const queryKey = favoriteKeys.list({ organizationId })
            const previousFavorites = queryClient.getQueryData<FavoritesResponse["data"]>(queryKey)
            const now = new Date().toISOString()
            const optimisticGroup: FavoriteGroup = {
                id: `optimistic:${generateUUID()}`,
                organizationId,
                name,
                position: Math.floor(Date.now() / 1000),
                createdAt: now,
                updatedAt: now,
            }

            queryClient.setQueryData<FavoritesResponse["data"]>(queryKey, (data) =>
                upsertFavoriteGroupData(data, optimisticGroup)
            )

            return { organizationId, previousFavorites, optimisticGroupId: optimisticGroup.id }
        },
        onError: (error, _variables, context) => {
            if (!context?.organizationId) return

            queryClient.setQueryData(
                favoriteKeys.list({ organizationId: context.organizationId }),
                context.previousFavorites
            )
            showErrorToast(getErrorMessage(error, "Failed to create favorite group"))
        },
        onSuccess: (group, variables, context) => {
            const queryKey = favoriteKeys.list({ organizationId: variables.organizationId })
            queryClient.setQueryData<FavoritesResponse["data"]>(queryKey, (data) =>
                upsertFavoriteGroupData(
                    context?.optimisticGroupId
                        ? removeFavoriteGroupData(data, context.optimisticGroupId)
                        : data,
                    group
                )
            )
            if (variables.showToast !== false) {
                showSuccessToast("Group created")
            }
        },
        onSettled: (_data, _error, variables) => {
            void queryClient.invalidateQueries({
                queryKey: favoriteKeys.list({ organizationId: variables.organizationId }),
                refetchType: "none",
            })
        },
    })
}

export function useRenameFavoriteGroup() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: renameFavoriteGroup,
        onMutate: async ({ organizationId, groupId, name }) => {
            await queryClient.cancelQueries({ queryKey: favoriteKeys.list({ organizationId }) })

            const queryKey = favoriteKeys.list({ organizationId })
            const previousFavorites = queryClient.getQueryData<FavoritesResponse["data"]>(queryKey)
            const previousGroup = previousFavorites?.groups?.find((group) => group.id === groupId)

            if (previousGroup) {
                queryClient.setQueryData<FavoritesResponse["data"]>(queryKey, (data) =>
                    upsertFavoriteGroupData(data, {
                        ...previousGroup,
                        name,
                        updatedAt: new Date().toISOString(),
                    })
                )
            }

            return { organizationId, previousFavorites }
        },
        onError: (error, _variables, context) => {
            if (!context?.organizationId) return

            queryClient.setQueryData(
                favoriteKeys.list({ organizationId: context.organizationId }),
                context.previousFavorites
            )
            showErrorToast(getErrorMessage(error, "Failed to rename favorite group"))
        },
        onSuccess: (group, variables) => {
            queryClient.setQueryData<FavoritesResponse["data"]>(
                favoriteKeys.list({ organizationId: variables.organizationId }),
                (data) => upsertFavoriteGroupData(data, group)
            )
        },
        onSettled: (_data, _error, variables) => {
            void queryClient.invalidateQueries({
                queryKey: favoriteKeys.list({ organizationId: variables.organizationId }),
                refetchType: "none",
            })
        },
    })
}

export function useDeleteFavoriteGroup() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteFavoriteGroup,
        onMutate: async ({ organizationId, groupId }) => {
            await queryClient.cancelQueries({ queryKey: favoriteKeys.list({ organizationId }) })

            const queryKey = favoriteKeys.list({ organizationId })
            const previousFavorites = queryClient.getQueryData<FavoritesResponse["data"]>(queryKey)
            queryClient.setQueryData<FavoritesResponse["data"]>(queryKey, (data) =>
                removeFavoriteGroupData(data, groupId)
            )

            return { organizationId, previousFavorites }
        },
        onError: (error, _variables, context) => {
            if (!context?.organizationId) return

            queryClient.setQueryData(
                favoriteKeys.list({ organizationId: context.organizationId }),
                context.previousFavorites
            )
            showErrorToast(getErrorMessage(error, "Failed to remove favorite group"))
        },
        onSuccess: () => {
            showSuccessToast("Group removed")
        },
        onSettled: (_data, _error, variables) => {
            void queryClient.invalidateQueries({
                queryKey: favoriteKeys.list({ organizationId: variables.organizationId }),
                refetchType: "none",
            })
        },
    })
}

export function useReorderFavorites() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: reorderFavorites,
        onMutate: async ({ organizationId, items, groups }) => {
            await queryClient.cancelQueries({ queryKey: favoriteKeys.list({ organizationId }) })

            const queryKey = favoriteKeys.list({ organizationId })
            const previousFavorites = queryClient.getQueryData<FavoritesResponse["data"]>(queryKey)
            queryClient.setQueryData<FavoritesResponse["data"]>(queryKey, (data) =>
                updateFavoritePlacementsData(data, items, groups)
            )

            return { organizationId, previousFavorites }
        },
        onError: (error, _variables, context) => {
            if (!context?.organizationId) return

            queryClient.setQueryData(
                favoriteKeys.list({ organizationId: context.organizationId }),
                context.previousFavorites
            )
            showErrorToast(getErrorMessage(error, "Failed to update favorites order"))
        },
        onSettled: (_data, _error, variables) => {
            void queryClient.invalidateQueries({
                queryKey: favoriteKeys.list({ organizationId: variables.organizationId }),
                refetchType: "none",
            })
        },
    })
}
