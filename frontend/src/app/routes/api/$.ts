import { createFileRoute } from "@tanstack/react-router"
import { handleApiProxyRequest } from "@/app/server/api-proxy.server"

export const Route = createFileRoute("/api/$")({
    server: {
        handlers: {
            ANY: ({ request }) => handleApiProxyRequest(request),
        },
    },
})
