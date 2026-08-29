import type { FavoriteItem } from "@/entities/favorite"
import {
    type Conversation,
    getConversationDisplayType,
    normalizeConversationDisplayName,
} from "@/features/chat"

const favoriteConversationTypes = ["team", "member_dm", "requester"] as const

export type FavoriteConversationType = (typeof favoriteConversationTypes)[number]

interface FavoriteDisplayLabelOptions {
    favorite: FavoriteItem
    conversation?: Conversation
    organizationName: string
    t: (key: string, options: Record<string, unknown>) => string
}

export function getFavoriteConversationType(
    favorite: FavoriteItem,
    conversation?: Conversation
): FavoriteConversationType | null {
    if (favorite.entityType !== "conversation") return null
    if (conversation) return getConversationDisplayType(conversation)

    const conversationType = favorite.meta?.conversationType
    if (typeof conversationType === "string" && isFavoriteConversationType(conversationType)) {
        return conversationType
    }

    if (favorite.meta?.isTeamChat === true || isGenericTeamChatLabel(favorite.label)) {
        return "team"
    }

    if (hasNonEmptyMetaValue(favorite, "requesterName", "customerName")) {
        return "requester"
    }

    if (hasNonEmptyMetaValue(favorite, "participantName", "userName")) {
        return "member_dm"
    }

    if (isDirectMessageLabel(favorite.label)) {
        return "requester"
    }

    return null
}

export function getFavoriteDisplayLabel({
    favorite,
    conversation,
    organizationName,
    t,
}: FavoriteDisplayLabelOptions): string {
    const conversationType = getFavoriteConversationType(favorite, conversation)

    if (conversationType === "team") {
        const name = getFavoriteConversationName(favorite, conversation)
        return isGenericTeamChatLabel(name) ? organizationName : name
    }

    if (conversationType === "requester") {
        const requestNumber =
            typeof favorite.meta?.requestNumber === "string" ? favorite.meta.requestNumber : null
        const name = getFavoriteConversationName(favorite, conversation)

        if (requestNumber) {
            return t("sidebar.favoriteRequesterChatWithRequest", {
                defaultValue: "Request chat #{{requestNumber}} with {{name}}",
                requestNumber,
                name,
            })
        }

        return t("sidebar.favoriteRequesterChat", {
            defaultValue: "Request chat with {{name}}",
            name,
        })
    }

    return favorite.label
}

function isFavoriteConversationType(value: string): value is FavoriteConversationType {
    return favoriteConversationTypes.some((type) => type === value)
}

function getFavoriteConversationName(favorite: FavoriteItem, conversation?: Conversation): string {
    if (conversation) {
        if (conversation.conversationType === "team") {
            return normalizeConversationDisplayName(
                conversation.contextInfo?.name || conversation.name
            )
        }

        return normalizeConversationDisplayName(conversation.name)
    }

    const metadataNameKeys = [
        "requesterName",
        "customerName",
        "participantName",
        "userName",
        "name",
    ]
    for (const key of metadataNameKeys) {
        const value = favorite.meta?.[key]
        if (typeof value === "string" && value.trim()) {
            return normalizeConversationDisplayName(value)
        }
    }

    return normalizeConversationDisplayName(favorite.label)
}

function hasNonEmptyMetaValue(favorite: FavoriteItem, ...keys: string[]): boolean {
    return keys.some((key) => {
        const value = favorite.meta?.[key]
        return typeof value === "string" && value.trim().length > 0
    })
}

function isGenericTeamChatLabel(label: string): boolean {
    return label.trim().toLowerCase() === "team chat"
}

function isDirectMessageLabel(label: string): boolean {
    return /^(request(?:er)? chat direct message with|direct message with|dm with)\s+/i.test(
        label.trim()
    )
}
