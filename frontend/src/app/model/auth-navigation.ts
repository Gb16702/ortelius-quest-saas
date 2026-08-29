import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import * as v from "valibot"
import type { TanstackRouterContext } from "@/app/model/router.context"
import type { publicEnv } from "@/shared/config/env"
import { appPathRedirectSchema } from "@/shared/lib/validation/url.schema"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { isAuthenticatedMeRouteSession } from "./me-route-session"

const loginHintSchema = v.optional(v.pipe(v.string(), v.trim(), v.minLength(1)))

const authEntrypointPaths = new Set(["/sign-in", "/auth/post-redirect"])

const authSearchBaseSchema = v.object({
    redirect: v.optional(appPathRedirectSchema),
    email: loginHintSchema,
    login_hint: loginHintSchema,
})

export const authSearchSchema = v.pipe(
    authSearchBaseSchema,
    v.transform((search) =>
        search.redirect && isAuthEntrypointPath(search.redirect)
            ? { ...search, redirect: undefined }
            : search
    )
)

export type AuthSearch = v.InferOutput<typeof authSearchSchema>

interface BuildPortalAuthUrlArgs {
    fallbackRedirect?: string
    portalPath?: string
    preserveParams?: readonly (keyof AuthSearch)[]
    publicEnv: typeof publicEnv
    requestOrigin: string
    search: AuthSearch
}

interface AuthRouteRedirectInput {
    redirect?: string | null
}

const authRouteRedirectInputSchema = v.pipe(
    v.nullish(appPathRedirectSchema),
    v.transform((redirect) => ({ redirect: redirect ?? null }))
)

function getLoginUrl(env: typeof publicEnv): URL {
    return new URL(`${env.PORTAL_ACCOUNT_URL}/auth`)
}

function appendPortalPath(url: URL, portalPath: string | undefined): URL {
    if (!portalPath) return url

    const basePath = url.pathname.replace(/\/$/, "")
    const normalizedPath = portalPath.replace(/^\/+/, "")
    url.pathname = `${basePath}/${normalizedPath}`
    return url
}

export function buildPortalAuthUrl({
    fallbackRedirect = "/",
    portalPath,
    preserveParams = [],
    publicEnv,
    requestOrigin,
    search,
}: BuildPortalAuthUrlArgs): string {
    const url = appendPortalPath(getLoginUrl(publicEnv), portalPath)
    const redirectPath = search.redirect ?? fallbackRedirect
    url.searchParams.set("redirect_uri", new URL(redirectPath, requestOrigin).toString())

    const loginHint = search.login_hint ?? search.email
    if (loginHint) {
        url.searchParams.set("login_hint", loginHint)
        url.searchParams.set("email", loginHint)
    }

    for (const key of preserveParams) {
        const value = search[key]
        if (typeof value === "string" && value.trim()) {
            url.searchParams.set(key, value)
        }
    }

    return url.toString()
}

export function resolveSafeAuthRedirect(search: AuthSearch, fallback: string): string {
    if (!search.redirect || isAuthEntrypointPath(search.redirect)) return fallback
    return search.redirect
}

export function resolveUnauthenticatedRedirectSearch(path: string): AuthSearch {
    return isAuthEntrypointPath(path) ? {} : { redirect: path }
}

export function resolveCleanAuthRoutePath(url: URL): string | null {
    const redirectTarget = url.searchParams.get("redirect")
    if (!redirectTarget || !isAuthEntrypointPath(redirectTarget)) return null

    const cleanUrl = new URL(url)
    cleanUrl.searchParams.delete("redirect")
    return `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
}

export function getAuthenticatedFallbackPath(
    activeOrganizationSlug: string | null | undefined
): string {
    return activeOrganizationSlug ? `/org/${activeOrganizationSlug}/requests` : "/me/requests"
}

export function isAuthEntrypointPath(path: string): boolean {
    try {
        const url = new URL(path, "https://ortelius.local")
        const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "")
        return authEntrypointPaths.has(pathname)
    } catch {
        return false
    }
}

export const resolveAuthenticatedAuthRouteRedirect = createServerFn({ method: "GET" })
    .inputValidator((input: AuthRouteRedirectInput) =>
        parseSchema(authRouteRedirectInputSchema, input.redirect)
    )
    .handler(async ({ data }): Promise<string | null> => {
        const { getRequest } = await import("@tanstack/react-start/server")
        const { getAuthSession, resolvePostAuthPath } = await import("@/features/auth/index.server")

        const { accessToken, user } = await getAuthSession(getRequest())
        if (!user || !accessToken) return null

        return resolvePostAuthPath(accessToken, data.redirect)
    })

export async function redirectAuthenticatedAuthRoute(
    context: TanstackRouterContext,
    search: AuthSearch
): Promise<void> {
    if (isAuthenticatedMeRouteSession(context)) {
        throw redirect({
            href: resolveSafeAuthRedirect(
                search,
                getAuthenticatedFallbackPath(context.activeOrganization?.slug)
            ),
            replace: true,
        })
    }

    const serverTarget = await resolveAuthenticatedAuthRouteRedirect({
        data: { redirect: search.redirect ?? null },
    })

    if (serverTarget) {
        throw redirect({
            href: serverTarget,
            replace: true,
        })
    }
}
