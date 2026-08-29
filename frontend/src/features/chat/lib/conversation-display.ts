import type { Conversation } from "../model/chat"

export interface ConversationFavoriteDisplayMetadata {
    conversationType: Conversation["conversationType"]
    isTeamChat: boolean
    name: string
}

export function getConversationDisplayName(conversation: Conversation): string {
    if (conversation.conversationType === "team") {
        return normalizeConversationDisplayName(conversation.contextInfo?.name || conversation.name)
    }

    return normalizeConversationDisplayName(conversation.name)
}

export function getConversationFavoriteDisplayMetadata(
    conversation: Conversation
): ConversationFavoriteDisplayMetadata {
    const conversationType = getConversationDisplayType(conversation)

    return {
        conversationType,
        isTeamChat: conversationType === "team",
        name: getConversationDisplayName(conversation),
    }
}

export function getConversationDisplayType(
    conversation: Conversation
): Conversation["conversationType"] {
    if (conversation.conversationType === "team") return "team"

    if (conversation.contextInfo?.type === "user" && conversation.contextInfo.id === null) {
        return "requester"
    }

    return conversation.conversationType
}

export function normalizeConversationDisplayName(name: string): string {
    return name
        .replace(/^request(?:er)? chat direct message with\s+/i, "")
        .replace(/^request chat with\s+/i, "")
        .replace(/^customer chat with\s+/i, "")
        .replace(/^direct message with\s+/i, "")
        .replace(/^dm with\s+/i, "")
        .replace(/^chat with\s+/i, "")
        .trim()
}
