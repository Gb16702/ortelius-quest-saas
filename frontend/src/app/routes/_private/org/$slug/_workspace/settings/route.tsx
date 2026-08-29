import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requireOrgAdminRoute } from "@/app/model/org-workspace-session"

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings")({
    beforeLoad: ({ context }) => {
        requireOrgAdminRoute(context)
    },
    component: OrgSettingsRoute,
})

function OrgSettingsRoute() {
    return <Outlet />
}
