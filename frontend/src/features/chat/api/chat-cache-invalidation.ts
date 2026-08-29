import type { QueryClient } from "@tanstack/react-query"
import { chatKeys } from "./chat.query-keys"

interface InvalidateMemberDmConversationListsInput {
    queryClient: QueryClient
    userId: string | null | undefined
    organizationId: string
    organizationSlug: string
}

export function invalidateMemberDmConversationLists({
    queryClient,
    userId,
    organizationId,
    organizationSlug,
}: InvalidateMemberDmConversationListsInput): void {
    if (!userId) return

    for (const scope of [`/org/${organizationSlug}`, `${organizationId}:sidebar-members`]) {
        void queryClient.invalidateQueries({
            queryKey: chatKeys.conversationsFeedScope({ userId, scope }),
            refetchType: "active",
        })
        void queryClient.invalidateQueries({
            queryKey: chatKeys.initialConversationsPageScope({ userId, scope }),
            refetchType: "active",
        })
    }
}
