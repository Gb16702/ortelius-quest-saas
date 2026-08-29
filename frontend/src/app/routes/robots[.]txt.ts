import { createFileRoute } from "@tanstack/react-router"
import { getRequestUrl } from "@tanstack/react-start/server"
import { buildRobotsResponse } from "@/app/seo/technical-seo"

export const Route = createFileRoute("/robots.txt")({
    server: {
        handlers: {
            GET: () => {
                const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
                return buildRobotsResponse(url.origin)
            },
            HEAD: () => {
                const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
                const full = buildRobotsResponse(url.origin)
                return new Response(null, { headers: full.headers, status: full.status })
            },
        },
    },
})
