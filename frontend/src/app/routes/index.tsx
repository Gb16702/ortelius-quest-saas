import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { getAuthSession, resolvePostAuthPath } from "@/features/auth/index.server"

const resolveRootRedirect = createServerFn({ method: "GET" }).handler(async () => {
    const request = getRequest()
    const { user, accessToken } = await getAuthSession(request)

    if (!user || !accessToken) {
        throw redirect({ to: "/sign-in" })
    }

    throw redirect({ href: await resolvePostAuthPath(accessToken, null) })
})

export const Route = createFileRoute("/")({
    beforeLoad: () => resolveRootRedirect(),
    head: () => ({
        meta: [{ title: "Ortelius Quest" }, { name: "robots", content: "noindex, nofollow" }],
    }),
    component: RootRedirectRoute,
})

function RootRedirectRoute() {
    return null
}
