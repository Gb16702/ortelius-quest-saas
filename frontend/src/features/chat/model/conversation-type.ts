export const conversationTypeValues = ["team", "member_dm", "requester"] as const
export const conversationTypeFilterValues = ["all", ...conversationTypeValues] as const

export type ConversationType = (typeof conversationTypeValues)[number]
export type ConversationTypeFilter = (typeof conversationTypeFilterValues)[number]

interface DeriveConversationTypeInput {
    conversationType?: ConversationType
    isTeamChat?: boolean
}

export function deriveConversationType({
    conversationType,
    isTeamChat,
}: DeriveConversationTypeInput): ConversationType | null {
    if (conversationType) return conversationType
    if (isTeamChat === true) return "team"
    if (isTeamChat === false) return "requester"
    return null
}

export function isTeamConversationType(conversationType: ConversationType): boolean {
    return conversationType === "team"
}

export function isConversationTypeFilter(value: string): value is ConversationTypeFilter {
    return conversationTypeFilterValues.some((filterValue) => filterValue === value)
}
