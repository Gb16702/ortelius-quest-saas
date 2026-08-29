import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { buildOrgAuthedStartHead } from "@/app/model/route-seo-head"
import { OrgChatConversationPage } from "@/pages/org-chat-conversation"

const orgRouteApi = getRouteApi("/_private/org/$slug/_workspace")

export const Route = createFileRoute("/_private/org/$slug/_workspace/chat/$id")({
    staticData: { orgTitleSections: ["Conversations"] },
    head: ({ matches }) => buildOrgAuthedStartHead({ matches, sections: ["Conversations"] }),
    component: OrgChatConversationRoute,
})

function OrgChatConversationRoute() {
    const navigate = Route.useNavigate()
    const { id, slug } = Route.useParams()
    const { sessionData } = orgRouteApi.useRouteContext()

    return (
        <OrgChatConversationPage
            conversationId={id}
            sessionData={sessionData}
            hrefBasePath={`/org/${slug}`}
            onNavigate={(href) => {
                navigate({ href })
            }}
        />
    )
}
