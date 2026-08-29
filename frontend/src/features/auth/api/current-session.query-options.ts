import { queryOptions } from "@tanstack/react-query"
import type { ActiveOrganization, SessionResponse, User } from "@/entities/session"
import { activeOrganizationResponseSchema, userSchema } from "@/entities/session"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

export interface CurrentSessionData {
    sessionData: SessionResponse | null
    user: User | null
    activeOrganization: ActiveOrganization | null
}

export const currentSessionQueryKey = ["auth", "current-session"] as const
export const currentUserQueryKey = ["auth", "current-user"] as const

export function currentUserQueryOptions() {
    return queryOptions({
        queryKey: currentUserQueryKey,
        queryFn: ({ signal }) => readCurrentUser(signal),
        staleTime: 30_000,
    })
}

export function currentSessionQueryOptions() {
    return queryOptions({
        queryKey: currentSessionQueryKey,
        queryFn: ({ signal }) => readCurrentSession(signal),
        staleTime: 30_000,
    })
}

async function readCurrentSession(signal: AbortSignal): Promise<CurrentSessionData> {
    const user = await readCurrentUser(signal)
    if (!user) {
        return {
            sessionData: null,
            user: null,
            activeOrganization: null,
        }
    }

    const activeOrganization = await readActiveOrganization(signal)
    const sessionData: SessionResponse = {
        user,
        session: {
            activeOrganizationId: activeOrganization?.id ?? null,
        },
        accessToken: null,
    }

    return {
        sessionData,
        user,
        activeOrganization,
    }
}

async function readCurrentUser(signal: AbortSignal): Promise<User | null> {
    const response = await fetch("/api/auth/profile", {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
        signal,
    })

    if (!response.ok) return null

    return parseSchema(userSchema, await readJsonResponse(response))
}

async function readActiveOrganization(signal: AbortSignal): Promise<ActiveOrganization | null> {
    const response = await fetch("/api/onboarding/status", {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
        signal,
    })

    if (!response.ok) return null

    return parseSchema(activeOrganizationResponseSchema, await readJsonResponse(response))
        .organization
}
