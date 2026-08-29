import { parse } from "cookie"
import type { RefreshedAuthSession, User } from "@/entities/session"
import { authMeResponseSchema, userSchema } from "@/entities/session"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    extractSetCookies,
    getDevTokens,
    normalizeAuthSetCookiesForCurrentHost,
} from "./dev-cookies.server"

export type { RefreshedAuthSession, Session, SessionResponse, User } from "@/entities/session"

function userFromAuthPayload(payload: { sub: string; email?: string; name?: string }): User {
    return {
        id: payload.sub,
        name: payload.name ?? "",
        email: payload.email ?? "",
        emailVerified: true,
        image: null,
        createdAt: "",
        updatedAt: "",
        twoFactorEnabled: false,
        stripeCustomerId: null,
        role: "member",
        dominantColor: null,
    }
}

export function getAccessTokenFromRequestCookies(request: Request): string | null {
    if (serverEnv.NODE_ENV !== "production") return getDevTokens(request).accessToken

    const cookies = parse(request.headers.get("Cookie") || "")
    return cookies.ortelius_access_token || null
}

async function getProfileFromToken(accessToken: string): Promise<User | null> {
    try {
        const res = await fetch(`${serverEnv.API_URL}/api/auth/profile`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        })
        if (res.ok) return parseSchema(userSchema, await readJsonResponse(res))
    } catch {}
    return null
}

export async function getAuthSession(
    request: Request
): Promise<{ user: User | null; accessToken: string | null }> {
    if (serverEnv.NODE_ENV !== "production") {
        const { accessToken } = getDevTokens(request)
        if (accessToken) {
            const user = await getProfileFromToken(accessToken)
            if (user) return { user, accessToken }
        }
    }

    const refreshed = await refreshAuthSession(request)
    if (!refreshed.user || !refreshed.accessToken) return { user: null, accessToken: null }

    try {
        const fullUser = await getProfileFromToken(refreshed.accessToken)
        return { user: fullUser ?? refreshed.user, accessToken: refreshed.accessToken }
    } catch {
        return { user: null, accessToken: null }
    }
}

export async function refreshAuthSession(request: Request): Promise<RefreshedAuthSession> {
    try {
        const cookieHeader = request.headers.get("Cookie") || ""
        const authRes = await fetch(`${serverEnv.AUTH_URL}/auth/me`, {
            headers: { Cookie: cookieHeader },
        })
        const setCookies = normalizeAuthSetCookiesForCurrentHost(extractSetCookies(authRes))
        if (!authRes.ok) return { user: null, accessToken: null, setCookies }

        const payload = parseSchema(authMeResponseSchema, await authRes.json().catch(() => null))

        if (!payload.accessToken) return { user: null, accessToken: null, setCookies }
        return {
            user: userFromAuthPayload(payload),
            accessToken: payload.accessToken,
            setCookies,
        }
    } catch {
        return { user: null, accessToken: null, setCookies: [] }
    }
}
