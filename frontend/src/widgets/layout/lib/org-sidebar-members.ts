import type { OrganizationMember } from "@/entities/member"
import type { Conversation } from "@/features/chat"

export interface SidebarMemberConversationInfo {
    conversationId: string
    isUnread: boolean
    updatedAt: string
}

export interface SidebarMemberItem {
    member: OrganizationMember
    conversation: SidebarMemberConversationInfo | null
}

const SIDEBAR_MEMBER_LIMIT = 5

export function selectSidebarMembers({
    members,
    conversations,
    currentUserId,
    limit = SIDEBAR_MEMBER_LIMIT,
}: {
    members: readonly OrganizationMember[]
    conversations: readonly Conversation[]
    currentUserId: string
    limit?: number
}): SidebarMemberItem[] {
    const memberDmByUserId = new Map<string, SidebarMemberConversationInfo>()

    for (const conversation of conversations) {
        if (conversation.conversationType !== "member_dm") continue

        const userId =
            conversation.contextInfo?.type === "user" ? conversation.contextInfo.id : null
        if (!userId || userId === currentUserId) continue

        const current = memberDmByUserId.get(userId)
        const next = {
            conversationId: conversation.id,
            isUnread: Boolean(conversation.lastMessage?.isUnread),
            updatedAt: conversation.updatedAt,
        }

        if (!current || compareConversationInfo(next, current) < 0) {
            memberDmByUserId.set(userId, next)
        }
    }

    return members
        .filter((member) => member.user.id !== currentUserId)
        .map((member) => ({
            member,
            conversation: memberDmByUserId.get(member.user.id) ?? null,
        }))
        .sort(compareSidebarMembers)
        .slice(0, limit)
}

function compareSidebarMembers(a: SidebarMemberItem, b: SidebarMemberItem): number {
    const unreadDelta =
        Number(Boolean(b.conversation?.isUnread)) - Number(Boolean(a.conversation?.isUnread))
    if (unreadDelta !== 0) return unreadDelta

    const conversationDelta =
        readTime(b.conversation?.updatedAt) - readTime(a.conversation?.updatedAt)
    if (conversationDelta !== 0) return conversationDelta

    const lastSeenDelta = readTime(b.member.lastSeenAt) - readTime(a.member.lastSeenAt)
    if (lastSeenDelta !== 0) return lastSeenDelta

    return a.member.user.name.localeCompare(b.member.user.name)
}

function compareConversationInfo(
    a: SidebarMemberConversationInfo,
    b: SidebarMemberConversationInfo
): number {
    const unreadDelta = Number(b.isUnread) - Number(a.isUnread)
    if (unreadDelta !== 0) return unreadDelta

    return readTime(b.updatedAt) - readTime(a.updatedAt)
}

function readTime(value: string | null | undefined): number {
    if (!value) return 0
    const time = Date.parse(value)
    return Number.isFinite(time) ? time : 0
}
