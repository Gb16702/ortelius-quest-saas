import { createFileRoute, redirect } from "@tanstack/react-router"

export function createMeIndexRedirect() {
    return redirect({
        to: "/me/requests",
        replace: true,
    })
}

export function redirectMeIndex(): never {
    throw createMeIndexRedirect()
}

export const Route = createFileRoute("/_private/me/")({
    beforeLoad: () => {
        throw createMeIndexRedirect()
    },
})
