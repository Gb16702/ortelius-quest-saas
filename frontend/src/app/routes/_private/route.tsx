import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_private")({
    component: PrivateRoute,
})

function PrivateRoute() {
    return <Outlet />
}
