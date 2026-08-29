import { parse, serialize } from "cookie"
import { serverEnv } from "@/shared/config/env.server"

const AUTH_COOKIE_NAMES = [
    "ortelius_session",
    "ortelius_access_token",
    "oidc_access_token",
    "oidc_id_token",
    "ortelius_login_challenge",
] as const

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
}

export function extractSetCookies(response: Response): string[] {
    return typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : ([response.headers.get("set-cookie")].filter(Boolean) as string[])
}

function rewriteAuthCookieForLocalhost(cookie: string): string {
    const [nameValue, ...attributes] = cookie.split(";")
    const rewrittenAttributes = attributes
        .map((attribute) => attribute.trim())
        .filter((attribute) => {
            const lower = attribute.toLowerCase()
            return lower !== "secure" && !lower.startsWith("domain=")
        })

    return [nameValue.trim(), ...rewrittenAttributes].join("; ")
}

export function normalizeAuthSetCookiesForCurrentHost(cookies: string[]): string[] {
    if (serverEnv.NODE_ENV === "production") return cookies
    return cookies.map(rewriteAuthCookieForLocalhost)
}

export function setDevTokenCookies(
    headers: Headers,
    tokens: { accessToken: string; refreshToken?: string }
) {
    if (serverEnv.NODE_ENV === "production") return
    headers.append(
        "Set-Cookie",
        serialize("dev_access_token", tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 60 * 60 * 24 * 7,
        })
    )
    if (tokens.refreshToken) {
        headers.append(
            "Set-Cookie",
            serialize("dev_refresh_token", tokens.refreshToken, {
                ...COOKIE_OPTIONS,
                maxAge: 60 * 60 * 24 * 30,
            })
        )
    }
}

export function clearDevTokenCookies(headers: Headers) {
    if (serverEnv.NODE_ENV === "production") return
    for (const name of ["dev_access_token", "dev_refresh_token", ...AUTH_COOKIE_NAMES]) {
        headers.append("Set-Cookie", serialize(name, "", { ...COOKIE_OPTIONS, maxAge: 0 }))
    }
}

export function getDevTokens(request: Request): {
    accessToken: string | null
    refreshToken: string | null
} {
    if (serverEnv.NODE_ENV === "production") return { accessToken: null, refreshToken: null }
    const cookies = parse(request.headers.get("Cookie") || "")
    return {
        accessToken: cookies.ortelius_access_token || cookies.dev_access_token || null,
        refreshToken: cookies.dev_refresh_token || null,
    }
}
