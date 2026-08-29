import type { FavoriteItem, FavoritesResponse } from "@/entities/favorite"

export function createOptimisticAssistantConversationFavorite(input: {
    conversationId: string
    organizationId: string
    title: string
}): FavoriteItem {
    const createdAt = new Date().toISOString()

    return {
        id: `optimistic:assistant_conversation:${input.conversationId}`,
        entityType: "assistant_conversation",
        entityId: input.conversationId,
        organizationId: input.organizationId,
        label: input.title,
        subtitle: "AI chat",
        createdAt,
        meta: {
            assistantChat: true,
            title: input.title,
        },
    }
}

export function updateAssistantConversationFavoriteTitle(
    favorites: FavoritesResponse["data"] | undefined,
    input: {
        conversationId: string
        title: string
    }
): FavoritesResponse["data"] | undefined {
    if (!favorites) return favorites

    return {
        ...favorites,
        favorites: favorites.favorites.map((favorite) =>
            favorite.entityType === "assistant_conversation" &&
            favorite.entityId === input.conversationId
                ? {
                      ...favorite,
                      label: input.title,
                      meta: {
                          ...favorite.meta,
                          title: input.title,
                      },
                  }
                : favorite
        ),
    }
}

export function removeAssistantConversationFavorite(
    favorites: FavoritesResponse["data"] | undefined,
    conversationId: string
): FavoritesResponse["data"] | undefined {
    if (!favorites) return favorites

    return {
        ...favorites,
        favorites: favorites.favorites.filter(
            (favorite) =>
                favorite.entityType !== "assistant_conversation" ||
                favorite.entityId !== conversationId
        ),
    }
}
