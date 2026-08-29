import * as v from "valibot"

export const favoriteEntityTypeSchema = v.union([
    v.literal("request"),
    v.literal("quote"),
    v.literal("invoice"),
    v.literal("conversation"),
    v.literal("member"),
    v.literal("assistant_conversation"),
])

export const favoriteItemSchema = v.object({
    id: v.string(),
    entityType: favoriteEntityTypeSchema,
    entityId: v.string(),
    organizationId: v.nullable(v.string()),
    groupId: v.optional(v.nullable(v.string())),
    position: v.optional(v.number()),
    label: v.string(),
    subtitle: v.optional(v.string()),
    createdAt: v.string(),
    meta: v.optional(v.record(v.string(), v.union([v.string(), v.boolean(), v.null()]))),
})

export const favoriteGroupSchema = v.object({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    position: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const favoritesResponseSchema = v.object({
    success: v.optional(v.boolean()),
    data: v.object({
        favorites: v.array(favoriteItemSchema),
        groups: v.optional(v.array(favoriteGroupSchema)),
    }),
})

export const favoriteMutationResponseSchema = v.object({
    success: v.optional(v.boolean()),
    data: v.object({
        favorite: favoriteItemSchema,
    }),
})

export const favoriteGroupMutationResponseSchema = v.object({
    success: v.optional(v.boolean()),
    data: v.object({
        group: favoriteGroupSchema,
    }),
})

export type FavoriteEntityType = v.InferOutput<typeof favoriteEntityTypeSchema>
export type FavoriteGroup = v.InferOutput<typeof favoriteGroupSchema>
export type FavoriteItem = v.InferOutput<typeof favoriteItemSchema>
export type FavoriteGroupMutationResponse = v.InferOutput<
    typeof favoriteGroupMutationResponseSchema
>
export type FavoriteMutationResponse = v.InferOutput<typeof favoriteMutationResponseSchema>
export type FavoritesResponse = v.InferOutput<typeof favoritesResponseSchema>
