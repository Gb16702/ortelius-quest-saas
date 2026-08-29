import { readJsonResponse } from "@/shared/api/http.response"
import { wsTicketResponseSchema } from "@/shared/api/websocket/schemas/ws-ticket.schema"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export async function fetchWsTicket(): Promise<string | null> {
    try {
        const response = await fetch("/api/auth/ws-ticket", {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json" },
        })
        if (!response.ok) return null

        const result = safeParseSchema(wsTicketResponseSchema, await readJsonResponse(response))
        return result.success ? (result.data.ticket ?? null) : null
    } catch {
        return null
    }
}
