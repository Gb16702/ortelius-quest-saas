import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useEffect } from "react"
import {
    authSearchSchema,
    redirectAuthenticatedAuthRoute,
    resolveCleanAuthRoutePath,
} from "@/app/model/auth-navigation"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { convertHeadEntriesToStartHead } from "@/app/model/route-seo-head"
import { buildNonIndexableMetaForRoute } from "@/app/seo/meta-builders"
import { signInPagePropsSchema } from "@/features/auth"
import { AuthSignInPage } from "@/pages/auth-sign-in"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

const loadSignInPage = createServerFn({ method: "GET" }).handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server")
    const {
        buildPortalAuthRedirectUrl,
        getAuthSession,
        getSignInPageProps,
        isLocalAuthDevelopment,
        resolvePostAuthPath,
    } = await import("@/features/auth/index.server")

    const request = getRequest()
    const cleanPath = resolveCleanAuthRoutePath(new URL(request.url))
    if (cleanPath) {
        throw redirect({ href: cleanPath, replace: true })
    }

    const { accessToken, user } = await getAuthSession(request)
    if (user && accessToken) {
        const url = new URL(request.url)
        throw redirect({
            href: await resolvePostAuthPath(accessToken, url.searchParams.get("redirect")),
            replace: true,
        })
    }

    if (!isLocalAuthDevelopment()) {
        throw redirect({ href: buildPortalAuthRedirectUrl(request) })
    }
    return getSignInPageProps(request)
})

const handleSignInPost = createServerFn({ method: "POST" }).handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server")
    const { handleSignInRequest } = await import("@/features/auth/index.server")
    return handleSignInRequest(getRequest())
})

export const Route = createFileRoute("/_public/_auth/sign-in")({
    validateSearch: authSearchSchema,
    beforeLoad: ({ context, search }) => redirectAuthenticatedAuthRoute(context, search),
    loader: () => loadSignInPage(),
    head: () => {
        const origin = getCurrentOrigin()
        const entries = buildNonIndexableMetaForRoute({
            matches: [{ id: "start-root", data: { url: origin } }],
            kind: "auth",
            title: "Sign in — Ortelius Quest",
        })
        const head = convertHeadEntriesToStartHead(entries)
        return {
            meta: [...head.meta, { name: "robots", content: "noindex, nofollow" }],
            links: head.links,
            scripts: head.scripts,
        }
    },
    component: SignInRoute,
    server: {
        handlers: {
            POST: () => handleSignInPost(),
        },
    },
})

function SignInRoute() {
    const data = Route.useLoaderData()
    const props = parseSchema(signInPagePropsSchema, data)
    const hasError = props.actionData ? "error" in props.actionData : false

    useEffect(() => {
        if (!hasError || !window.location.search.includes("error=")) return
        window.history.replaceState(null, "", "/sign-in")
    }, [hasError])

    return (
        <AuthSignInPage
            actionData={props.actionData}
            email={props.email}
            formAction={props.formAction}
            isLoading={false}
        />
    )
}
