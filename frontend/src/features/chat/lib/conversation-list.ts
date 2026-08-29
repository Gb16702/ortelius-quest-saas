import type { ConversationFilterType } from "../api/chat.api"
import type { Conversation } from "../model/chat"
import type { ConversationSort } from "../model/conversation-sort"
import type { ConversationTypeFilter } from "../model/conversation-type"

export function countUnreadConversations(conversations: readonly Conversation[]): number {
    return conversations.filter((conversation) => conversation.lastMessage?.isUnread).length
}

export function hasActiveConversationFilters({
    searchQuery,
    filter,
    typeFilter,
    sort,
}: {
    searchQuery: string
    filter: ConversationFilterType
    typeFilter: ConversationTypeFilter
    sort: ConversationSort
}): boolean {
    return Boolean(searchQuery) || filter !== "all" || typeFilter !== "all" || sort !== "newest"
}
