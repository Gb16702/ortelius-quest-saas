import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_private/org/$slug/_workspace/settings/")({
    beforeLoad: ({ params }) => {
        throw redirect({
            to: "/org/$slug/settings/branding",
            params: { slug: params.slug },
            replace: true,
        })
    },
})
