interface FavoriteListParams {
    organizationId?: string
}

export const favoriteKeys = {
    all: ["favorites"] as const,
    list: ({ organizationId }: FavoriteListParams) =>
        [...favoriteKeys.all, "list", organizationId ?? "global"] as const,
}
