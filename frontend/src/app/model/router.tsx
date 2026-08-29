import { createRouter } from "@tanstack/react-router"
import { createAppQueryClient } from "@/app/lib/query-client"
import { publicEnv } from "@/shared/config/env"
import { routeTree } from "./route-tree.gen"
import type { TanstackRouterContext } from "./router.context"

export function getRouter() {
    const queryClient = createAppQueryClient()
    const context: TanstackRouterContext = {
        queryClient,
        sessionData: null,
        user: null,
        activeOrganization: null,
        publicEnv,
        requestOrigin: null,
    }

    return createRouter({
        routeTree,
        context,
        defaultPreload: "intent",
        scrollRestoration: true,
        trailingSlash: "preserve",
    })
}

export type StartRouter = ReturnType<typeof getRouter>

declare module "@tanstack/react-router" {
    interface Register {
        router: StartRouter
    }
}
