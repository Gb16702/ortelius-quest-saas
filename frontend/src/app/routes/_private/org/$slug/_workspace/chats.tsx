import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgChatsPage } from "@/pages/org-chats"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/chats")({
    staticData: { orgTitleSections: ["Conversations"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Conversations"] }),
    component: OrgChatsRoute,
})

function OrgChatsRoute() {
    const { sessionData } = orgRouteApi.useRouteContext()
    const { slug } = Route.useParams()

    return <OrgChatsPage sessionData={sessionData} hrefBasePath={`/org/${slug}`} />
}
