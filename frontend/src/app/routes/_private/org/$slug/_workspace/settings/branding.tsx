import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgSettingsBrandingPage } from "@/pages/org-settings-branding"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings/branding")({
    staticData: { orgTitleSections: ["Settings", "Branding"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Settings", "Branding"] }),
    component: OrgSettingsBrandingRoute,
})

function OrgSettingsBrandingRoute() {
    const { orgLayoutData } = orgRouteApi.useRouteContext()

    return <OrgSettingsBrandingPage organizationId={orgLayoutData.org.id} />
}
