import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import * as v from "valibot"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgSettingsBillingPage } from "@/pages/org-settings-billing"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

const orgSettingsBillingSearchSchema = v.fallback(
    v.object({
        plan: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
        billing: v.optional(v.picklist(["monthly", "yearly"])),
    }),
    {}
)

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings/billing")({
    validateSearch: orgSettingsBillingSearchSchema,
    staticData: { orgTitleSections: ["Settings", "Billing"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Settings", "Billing"] }),
    component: OrgSettingsBillingRoute,
})

function OrgSettingsBillingRoute() {
    const { orgLayoutData } = orgRouteApi.useRouteContext()

    return <OrgSettingsBillingPage organizationId={orgLayoutData.org.id} />
}
