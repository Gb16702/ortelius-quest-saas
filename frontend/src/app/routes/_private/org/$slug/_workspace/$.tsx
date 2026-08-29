import { createFileRoute, notFound } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgWorkspaceNotFoundPage } from "@/pages/org-workspace-not-found"

export const Route = createFileRoute("/_private/org/$slug/_workspace/$")({
    staticData: { orgTitleSections: ["Page not found"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Page not found"] }),
    beforeLoad: () => {
        throw notFound()
    },
    notFoundComponent: OrgWorkspaceNotFoundPage,
})
