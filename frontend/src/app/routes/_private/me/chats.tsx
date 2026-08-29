import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { MeChatsPage } from "@/pages/me-chats"

const meRouteApi = getRouteApi("/_private/me")

export const Route = createFileRoute("/_private/me/chats")({
    component: MeChatsRoute,
})

function MeChatsRoute() {
    const navigate = Route.useNavigate()
    const { sessionData } = meRouteApi.useRouteContext()

    return (
        <MeChatsPage
            sessionData={sessionData}
            hrefBasePath="/me"
            onNavigate={(href) => {
                navigate({ href })
            }}
        />
    )
}
