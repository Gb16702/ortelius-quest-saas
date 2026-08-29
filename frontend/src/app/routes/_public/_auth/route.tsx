import { createFileRoute, Outlet } from "@tanstack/react-router"
import { authSearchSchema, redirectAuthenticatedAuthRoute } from "@/app/model/auth-navigation"

export const Route = createFileRoute("/_public/_auth")({
    validateSearch: authSearchSchema,
    beforeLoad: ({ context, search }) => redirectAuthenticatedAuthRoute(context, search),
    component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-ds-surface px-4">
            <Outlet />
        </div>
    )
}
