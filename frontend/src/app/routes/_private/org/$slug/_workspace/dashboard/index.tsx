import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgDashboardPage } from "@/pages/org-dashboard"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/dashboard/")({
    staticData: { orgTitleSections: ["Dashboard"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Dashboard"] }),
    component: OrgDashboardRoute,
})

function OrgDashboardRoute() {
    const { sessionData } = orgRouteApi.useRouteContext()

    return <OrgDashboardPage sessionData={sessionData} />
}
