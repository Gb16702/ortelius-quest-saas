import type { ActiveOrganization } from "@/entities/session"
import { activeOrganizationResponseSchema } from "@/entities/session"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

export type { ActiveOrganization } from "@/entities/session"

export async function fetchActiveOrganization(
    accessToken: string
): Promise<ActiveOrganization | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)

    try {
        const res = await fetch(`${serverEnv.API_URL}/api/onboarding/status`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
        })

        if (!res.ok) return null

        const json = parseSchema(activeOrganizationResponseSchema, await readJsonResponse(res))
        return json.organization
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            logServerError("Active organization request timed out after 5s")
        }
        return null
    } finally {
        clearTimeout(timeout)
    }
}

function logServerError(message: string): void {
    if (serverEnv.NODE_ENV === "development") {
        console.error(`[Error] ${message}`)
    }
}
