import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { MeChatConversationPage } from "@/pages/me-chat-conversation"

const meRouteApi = getRouteApi("/_private/me")

export const Route = createFileRoute("/_private/me/chat/$id")({
    component: MeChatConversationRoute,
})

function MeChatConversationRoute() {
    const navigate = Route.useNavigate()
    const { id } = Route.useParams()
    const { sessionData } = meRouteApi.useRouteContext()

    return (
        <MeChatConversationPage
            conversationId={id}
            sessionData={sessionData}
            hrefBasePath="/me"
            onNavigate={(href) => {
                navigate({ href })
            }}
        />
    )
}
