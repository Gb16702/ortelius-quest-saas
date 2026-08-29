import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"

const ICE_SERVERS_ENDPOINT = "/api/calls/ice-servers"

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
]

const iceServerSchema = v.object({
    urls: v.union([v.string(), v.array(v.string())]),
    username: v.optional(v.string()),
    credential: v.optional(v.string()),
    credentialType: v.optional(v.picklist(["password", "oauth"])),
})

const iceServersResponseSchema = v.object({
    iceServers: v.array(iceServerSchema),
    ttl: v.optional(v.number()),
})

const iceServersApiResponseSchema = v.union([
    iceServersResponseSchema,
    v.object({
        success: v.literal(true),
        data: iceServersResponseSchema,
    }),
])

const iceServersApiErrorSchema = v.looseObject({
    message: v.optional(v.string()),
})

export interface IceServersConfig {
    iceServers: RTCIceServer[]
    source: "api" | "fallback"
    error?: string
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
    const result = v.safeParse(iceServersApiErrorSchema, payload)
    if (!result.success) return fallback
    return result.output.message || fallback
}

function parseIceServers(payload: unknown): RTCIceServer[] {
    const result = v.parse(iceServersApiResponseSchema, payload)
    return "data" in result ? result.data.iceServers : result.iceServers
}

function getUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message
    return "Failed to fetch TURN credentials"
}

export async function fetchIceServers(): Promise<IceServersConfig> {
    try {
        const response = await fetch(ICE_SERVERS_ENDPOINT, { credentials: "include" })
        const payload = await readJsonResponse(response)

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(payload, `HTTP ${response.status} ${response.statusText}`)
            )
        }

        const iceServers = parseIceServers(payload)
        if (iceServers.length > 0) {
            return { iceServers, source: "api" }
        }

        throw new Error("ICE server API returned no servers")
    } catch (error) {
        const message = getUnknownErrorMessage(error)
        console.warn("Failed to fetch TURN credentials, falling back to STUN:", error)
        return { iceServers: FALLBACK_ICE_SERVERS, source: "fallback", error: message }
    }
}
