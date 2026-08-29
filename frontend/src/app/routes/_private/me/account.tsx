import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { MeAccountPage } from "@/pages/me-account"

const meRouteApi = getRouteApi("/_private/me")

export const Route = createFileRoute("/_private/me/account")({
    component: MeAccountRoute,
})

function MeAccountRoute() {
    const { sessionData } = meRouteApi.useRouteContext()

    return <MeAccountPage sessionData={sessionData} />
}
