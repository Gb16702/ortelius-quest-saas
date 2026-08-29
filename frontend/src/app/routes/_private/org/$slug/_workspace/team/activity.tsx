import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { requireOrgAdminRoute } from "@/app/model/org-workspace-session"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgActivityPage } from "@/pages/org-activity"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/team/activity")({
    staticData: { orgTitleSections: ["Team", "Activity"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Team", "Activity"] }),
    beforeLoad: ({ context }) => {
        requireOrgAdminRoute(context)
    },
    component: OrgActivityRoute,
})

function OrgActivityRoute() {
    const { currentUserRole, sessionData } = orgRouteApi.useRouteContext()

    return <OrgActivityPage currentUserRole={currentUserRole} sessionData={sessionData} />
}
