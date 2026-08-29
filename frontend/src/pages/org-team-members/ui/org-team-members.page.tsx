import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { OrganizationMember } from "@/entities/member"
import { useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { invalidateMemberDmConversationLists, resolveMemberDmConversation } from "@/features/chat"
import { MembersPageContent, MembersPageProvider } from "@/features/members"
import { getErrorMessage } from "@/shared/lib/error"
import { showRetryErrorToast } from "@/shared/ui/toasts"

interface OrgTeamMembersPageProps {
    sessionData: SessionResponse
    onNavigate: (href: string) => void
}

export function OrgTeamMembersPage({ sessionData, onNavigate }: OrgTeamMembersPageProps) {
    const { t } = useTranslation("team")
    const queryClient = useQueryClient()
    const { meta } = useOrg()
    const { isPending: isStartingMemberDm, mutateAsync: startMemberDm } = useMutation({
        mutationFn: resolveMemberDmConversation,
    })
    const organizationId = sessionData.session?.activeOrganizationId ?? ""

    const handleStartMemberDm = useCallback(
        (member: OrganizationMember) => {
            const start = async () => {
                const result = await startMemberDm({
                    organizationId,
                    targetUserId: member.user.id,
                })

                onNavigate(`/org/${meta.slug}/chat/${encodeURIComponent(result.conversationId)}`)
                invalidateMemberDmConversationLists({
                    queryClient,
                    userId: sessionData.user?.id,
                    organizationId,
                    organizationSlug: meta.slug,
                })
            }

            start().catch((error: unknown) => {
                showRetryErrorToast(getErrorMessage(error, t("members.toast.startChatFailed")), {
                    onRetry: () => handleStartMemberDm(member),
                })
            })
        },
        [organizationId, meta.slug, onNavigate, queryClient, sessionData.user?.id, startMemberDm, t]
    )

    return (
        <MembersPageProvider
            sessionData={sessionData}
            isStartingMemberDm={isStartingMemberDm}
            onStartMemberDm={handleStartMemberDm}
        >
            <MembersPageContent />
        </MembersPageProvider>
    )
}
