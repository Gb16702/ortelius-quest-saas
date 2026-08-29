import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { MeRequestsPage } from "@/pages/me-requests"

const meRouteApi = getRouteApi("/_private/me")

export const Route = createFileRoute("/_private/me/requests")({
    component: MeRequestsRoute,
})

function MeRequestsRoute() {
    const navigate = Route.useNavigate()
    const { sessionData } = meRouteApi.useRouteContext()

    return (
        <MeRequestsPage
            sessionData={sessionData}
            onNavigate={(href) => {
                navigate({ href })
            }}
        />
    )
}
