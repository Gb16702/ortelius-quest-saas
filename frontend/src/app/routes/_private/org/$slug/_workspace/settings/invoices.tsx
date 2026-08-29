import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgSettingsInvoicesPage } from "@/pages/org-settings-invoices"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings/invoices")({
    staticData: { orgTitleSections: ["Settings", "Invoices"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Settings", "Invoices"] }),
    component: OrgSettingsInvoicesRoute,
})

function OrgSettingsInvoicesRoute() {
    const { orgLayoutData } = orgRouteApi.useRouteContext()

    return <OrgSettingsInvoicesPage organizationId={orgLayoutData.org.id} />
}
