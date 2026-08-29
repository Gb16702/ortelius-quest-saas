import { createFileRoute, redirect } from "@tanstack/react-router"
import {
    authSearchSchema,
    getAuthenticatedFallbackPath,
    resolveAuthenticatedAuthRouteRedirect,
    resolveSafeAuthRedirect,
} from "@/app/model/auth-navigation"
import { isAuthenticatedMeRouteSession } from "@/app/model/me-route-session"

export const Route = createFileRoute("/_public/_auth/auth/post-redirect")({
    validateSearch: authSearchSchema,
    beforeLoad: async ({ context, search }) => {
        if (isAuthenticatedMeRouteSession(context)) {
            throw redirect({
                href: resolveSafeAuthRedirect(
                    search,
                    getAuthenticatedFallbackPath(context.activeOrganization?.slug)
                ),
                replace: true,
            })
        }

        const serverTarget = await resolveAuthenticatedAuthRouteRedirect({
            data: { redirect: search.redirect ?? null },
        })

        throw redirect({
            href: serverTarget ?? "/sign-in",
            replace: true,
        })
    },
})
