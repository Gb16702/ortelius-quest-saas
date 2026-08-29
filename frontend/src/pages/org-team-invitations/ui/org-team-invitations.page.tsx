import type { Role } from "@/entities/access"
import type { SessionResponse } from "@/entities/session"
import { InvitationsPageContent, InvitationsPageProvider } from "@/features/members"

interface OrgTeamInvitationsPageProps {
    currentUserRole: Role
    sessionData: SessionResponse
}

export function OrgTeamInvitationsPage({
    currentUserRole,
    sessionData,
}: OrgTeamInvitationsPageProps) {
    return (
        <InvitationsPageProvider sessionData={sessionData} initialCurrentUserRole={currentUserRole}>
            <InvitationsPageContent />
        </InvitationsPageProvider>
    )
}
