import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgSettingsBusinessPage } from "@/pages/org-settings-business"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings/business")({
    staticData: { orgTitleSections: ["Settings", "Business"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Settings", "Business"] }),
    component: OrgSettingsBusinessRoute,
})

function OrgSettingsBusinessRoute() {
    const { orgLayoutData } = orgRouteApi.useRouteContext()

    return <OrgSettingsBusinessPage organizationId={orgLayoutData.org.id} />
}
