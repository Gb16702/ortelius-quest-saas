import { createFileRoute } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgSettingsLegalsPage } from "@/pages/org-settings-legals"

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings/legals")({
    staticData: { orgTitleSections: ["Settings", "Legals"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Settings", "Legals"] }),
    component: OrgSettingsLegalsPage,
})
