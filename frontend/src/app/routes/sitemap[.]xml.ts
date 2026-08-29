import { createFileRoute } from "@tanstack/react-router"
import { getRequestUrl } from "@tanstack/react-start/server"
import { buildSitemapResponse } from "@/app/seo/technical-seo"

export const Route = createFileRoute("/sitemap.xml")({
    server: {
        handlers: {
            GET: () => {
                const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
                return buildSitemapResponse(url.origin)
            },
            HEAD: () => {
                const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
                const full = buildSitemapResponse(url.origin)
                return new Response(null, { headers: full.headers, status: full.status })
            },
        },
    },
})
