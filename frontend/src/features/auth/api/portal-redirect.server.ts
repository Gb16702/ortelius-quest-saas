import { buildCanonicalAppUrl, isCanonicalAppPath } from "@/shared/config/app-origin.server"
import { serverEnv } from "@/shared/config/env.server"

export function isLocalAuthDevelopment(): boolean {
    return serverEnv.NODE_ENV !== "production"
}

function safeRedirectPath(value: string | null, fallback: string): string {
    if (value && isCanonicalAppPath(value)) return value
    return fallback
}

function buildPortalUrl(path = ""): URL {
    const url = new URL(serverEnv.LOGIN_URL)
    const basePath = url.pathname.replace(/\/$/, "")
    const normalizedPath = path.replace(/^\/+/, "")
    if (normalizedPath) {
        url.pathname = `${basePath}/${normalizedPath}`
    }
    return url
}

export function redirectToPortalAuth(
    request: Request,
    options: {
        portalPath?: string
        fallbackRedirect?: string
        preserveParams?: string[]
    } = {}
): Response {
    return new Response(null, {
        status: 302,
        headers: { Location: buildPortalAuthRedirectUrl(request, options) },
    })
}

export function buildPortalAuthRedirectUrl(
    request: Request,
    options: {
        portalPath?: string
        fallbackRedirect?: string
        preserveParams?: string[]
    } = {}
): string {
    const reqUrl = new URL(request.url)
    const target = safeRedirectPath(
        reqUrl.searchParams.get("redirect"),
        options.fallbackRedirect ?? "/"
    )
    const url = buildPortalUrl(options.portalPath)
    url.searchParams.set("redirect_uri", buildCanonicalAppUrl(target).toString())

    const loginHint = reqUrl.searchParams.get("login_hint") ?? reqUrl.searchParams.get("email")
    if (loginHint) {
        url.searchParams.set("login_hint", loginHint)
        url.searchParams.set("email", loginHint)
    }

    for (const key of options.preserveParams ?? []) {
        const value = reqUrl.searchParams.get(key)
        if (value) url.searchParams.set(key, value)
    }

    return url.toString()
}
