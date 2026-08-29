import * as v from "valibot"
import type { FavoriteItem } from "./favorite.schema"

const FAVORITE_CONVERSATION_DISPLAY_STORAGE_KEY = "ortelius_favorite_conversation_display"
const MAX_STORED_DISPLAY_ITEMS = 200

const favoriteConversationDisplayMetadataSchema = v.object({
    conversationType: v.union([v.literal("team"), v.literal("member_dm"), v.literal("requester")]),
    isTeamChat: v.boolean(),
    name: v.string(),
    updatedAt: v.string(),
})

const favoriteConversationDisplayRegistrySchema = v.record(
    v.string(),
    favoriteConversationDisplayMetadataSchema
)

export type FavoriteConversationDisplayMetadata = v.InferOutput<
    typeof favoriteConversationDisplayMetadataSchema
>

interface FavoriteConversationDisplayStorage {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
}

interface RememberFavoriteConversationDisplayInput {
    organizationId: string | null | undefined
    conversationId: string
    conversationType: FavoriteConversationDisplayMetadata["conversationType"]
    isTeamChat: boolean
    name: string
    storage?: Pick<FavoriteConversationDisplayStorage, "getItem" | "setItem">
}

interface ReadFavoriteConversationDisplayInput {
    organizationId: string | null | undefined
    conversationId: string
    storage?: Pick<FavoriteConversationDisplayStorage, "getItem">
}

function getLocalStorage(): Storage | undefined {
    return typeof localStorage === "undefined" ? undefined : localStorage
}

function getRegistryKey(organizationId: string | null | undefined, conversationId: string): string {
    return `${organizationId ?? "global"}:${conversationId}`
}

function readRegistry(
    storage: Pick<FavoriteConversationDisplayStorage, "getItem"> | undefined
): Record<string, FavoriteConversationDisplayMetadata> {
    if (!storage) return {}

    try {
        const rawValue = storage.getItem(FAVORITE_CONVERSATION_DISPLAY_STORAGE_KEY)
        if (!rawValue) return {}

        const parsedValue: unknown = JSON.parse(rawValue)
        const result = v.safeParse(favoriteConversationDisplayRegistrySchema, parsedValue)

        if (!result.success) return {}

        return result.output
    } catch {
        return {}
    }
}

export function readFavoriteConversationDisplayMetadata({
    organizationId,
    conversationId,
    storage,
}: ReadFavoriteConversationDisplayInput): FavoriteConversationDisplayMetadata | null {
    const registry = readRegistry(storage ?? getLocalStorage())
    return registry[getRegistryKey(organizationId, conversationId)] ?? null
}

export function rememberFavoriteConversationDisplay({
    organizationId,
    conversationId,
    conversationType,
    isTeamChat,
    name,
    storage,
}: RememberFavoriteConversationDisplayInput): void {
    const targetStorage = storage ?? getLocalStorage()
    if (!targetStorage) return

    try {
        const registry = readRegistry(targetStorage)
        const nextRegistry = pruneRegistry({
            ...registry,
            [getRegistryKey(organizationId, conversationId)]: {
                conversationType,
                isTeamChat,
                name,
                updatedAt: new Date().toISOString(),
            },
        })

        targetStorage.setItem(
            FAVORITE_CONVERSATION_DISPLAY_STORAGE_KEY,
            JSON.stringify(nextRegistry)
        )
    } catch {
        // Storage can be unavailable in private browsing or constrained embeds.
    }
}

export function mergeFavoriteConversationDisplayMetadata(favorite: FavoriteItem): FavoriteItem {
    if (favorite.entityType !== "conversation") return favorite

    const metadata = readFavoriteConversationDisplayMetadata({
        organizationId: favorite.organizationId,
        conversationId: favorite.entityId,
    })
    if (!metadata) return favorite

    return applyFavoriteConversationDisplayMetadata(favorite, metadata)
}

export function mergeFavoritesConversationDisplayMetadata(
    favorites: FavoriteItem[]
): FavoriteItem[] {
    return favorites.map(mergeFavoriteConversationDisplayMetadata)
}

export function applyFavoriteConversationDisplayMetadata(
    favorite: FavoriteItem,
    metadata: FavoriteConversationDisplayMetadata
): FavoriteItem {
    return {
        ...favorite,
        label: metadata.name,
        meta: {
            ...favorite.meta,
            conversationType: metadata.conversationType,
            isTeamChat: metadata.isTeamChat,
            name: metadata.name,
            requesterName: metadata.conversationType === "requester" ? metadata.name : null,
            participantName: metadata.conversationType === "member_dm" ? metadata.name : null,
        },
    }
}

function pruneRegistry(
    registry: Record<string, FavoriteConversationDisplayMetadata>
): Record<string, FavoriteConversationDisplayMetadata> {
    const entries = Object.entries(registry).sort(
        ([, a], [, b]) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    )

    return Object.fromEntries(entries.slice(0, MAX_STORED_DISPLAY_ITEMS))
}
