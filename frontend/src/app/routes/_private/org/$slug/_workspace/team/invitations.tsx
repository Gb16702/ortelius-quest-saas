import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { requireOrgAdminRoute } from "@/app/model/org-workspace-session"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgTeamInvitationsPage } from "@/pages/org-team-invitations"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/team/invitations")({
    staticData: { orgTitleSections: ["Team", "Invitations"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Team", "Invitations"] }),
    beforeLoad: ({ context }) => {
        requireOrgAdminRoute(context)
    },
    component: OrgTeamInvitationsRoute,
})

function OrgTeamInvitationsRoute() {
    const { currentUserRole, sessionData } = orgRouteApi.useRouteContext()

    return <OrgTeamInvitationsPage currentUserRole={currentUserRole} sessionData={sessionData} />
}
