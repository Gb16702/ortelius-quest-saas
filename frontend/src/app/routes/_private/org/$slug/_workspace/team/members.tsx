import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgTeamMembersPage } from "@/pages/org-team-members"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/team/members")({
    staticData: { orgTitleSections: ["Team", "Members"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Team", "Members"] }),
    component: OrgTeamMembersRoute,
})

function OrgTeamMembersRoute() {
    const navigate = Route.useNavigate()
    const { sessionData } = orgRouteApi.useRouteContext()

    return (
        <OrgTeamMembersPage
            sessionData={sessionData}
            onNavigate={(href) => {
                navigate({ href })
            }}
        />
    )
}
