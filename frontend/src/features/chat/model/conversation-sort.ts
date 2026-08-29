export const conversationSortValues = ["newest", "oldest"] as const

export type ConversationSort = (typeof conversationSortValues)[number]

export function isConversationSort(value: string): value is ConversationSort {
    return conversationSortValues.some((sortValue) => sortValue === value)
}
