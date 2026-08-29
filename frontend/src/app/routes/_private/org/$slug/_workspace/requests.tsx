import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgRequestsPage } from "@/pages/org-requests"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/requests")({
    staticData: { orgTitleSections: ["Requests"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Requests"] }),
    component: OrgRequestsRoute,
})

function OrgRequestsRoute() {
    const { currentUserRole, sessionData } = orgRouteApi.useRouteContext()

    return <OrgRequestsPage currentUserRole={currentUserRole} sessionData={sessionData} />
}
