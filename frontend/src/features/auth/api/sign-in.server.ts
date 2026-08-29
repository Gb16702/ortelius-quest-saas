import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import type { SignInPageProps } from "../model/sign-in"
import {
    extractSetCookies,
    normalizeAuthSetCookiesForCurrentHost,
    setDevTokenCookies,
} from "./dev-cookies.server"
import { resolveE2ELogin } from "./e2e-login.server"
import { redirectToPortalAuth } from "./portal-redirect.server"
import { resolvePostAuthPath } from "./post-auth-redirect.server"

const signInErrorCodeSchema = v.optional(
    v.picklist(["invalid_credentials", "login_failed", "unexpected_response"])
)

const devLoginResponseSchema = v.looseObject({
    error: v.optional(v.string()),
    message: v.optional(v.string()),
    challenge: v.optional(v.literal("MFA_REQUIRED")),
    session: v.optional(v.string()),
    username: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
})

function isLocalAuthDevelopment(): boolean {
    return serverEnv.NODE_ENV !== "production"
}

function getTrustedOrigin(request: Request): string {
    return request.headers.get("Origin") ?? new URL(request.url).origin
}

function getSignInErrorMessage(code: v.InferOutput<typeof signInErrorCodeSchema>): string | null {
    switch (code) {
        case "invalid_credentials":
            return "Invalid email or password"
        case "login_failed":
            return "Login failed"
        case "unexpected_response":
            return "Unexpected response"
        default:
            return null
    }
}

function getLoginResponseMessage(payload: v.InferOutput<typeof devLoginResponseSchema>): string {
    return payload.message || payload.error || "Login failed"
}

export function getSignInPageProps(request: Request): SignInPageProps {
    const url = new URL(request.url)
    const email = url.searchParams.get("email") ?? url.searchParams.get("login_hint") ?? ""
    const errorCode = v.parse(signInErrorCodeSchema, url.searchParams.get("error") ?? undefined)
    const errorMessage = getSignInErrorMessage(errorCode)

    return {
        actionData: errorMessage ? { error: errorMessage } : null,
        email,
        formAction: buildLocalSignInAction(url),
    }
}

export async function handleSignInRequest(request: Request): Promise<Response> {
    if (!isLocalAuthDevelopment()) return redirectToPortalAuth(request)

    const formData = await request.formData()
    const email = readFormString(formData, "email")
    const password = readFormString(formData, "password")

    const e2eLogin = resolveE2ELogin({ email, password })
    if (e2eLogin) {
        if (!e2eLogin.ok) {
            return redirectToSignInError(request, "invalid_credentials", email)
        }

        const headers = new Headers()
        setDevTokenCookies(headers, { accessToken: e2eLogin.accessToken })
        return redirectAfterSignIn(request, e2eLogin.accessToken, headers)
    }

    const response = await fetch(`${serverEnv.AUTH_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: getTrustedOrigin(request),
        },
        body: JSON.stringify({ email, password }),
    })
    const authSetCookies = normalizeAuthSetCookiesForCurrentHost(extractSetCookies(response))
    const payload = v.parse(devLoginResponseSchema, await readJsonResponse(response))

    if (!response.ok) {
        const code =
            getLoginResponseMessage(payload) === "Invalid email or password"
                ? "invalid_credentials"
                : "login_failed"
        return redirectToSignInError(request, code, email)
    }

    if (payload.challenge === "MFA_REQUIRED" && payload.session && payload.username) {
        const url = new URL("/mfa", request.url)
        url.searchParams.set("session", payload.session)
        url.searchParams.set("username", payload.username)
        return Response.redirect(url.toString(), 303)
    }

    if (!payload.accessToken) {
        return redirectToSignInError(request, "unexpected_response", email)
    }

    const headers = new Headers()
    for (const cookie of authSetCookies) {
        headers.append("Set-Cookie", cookie)
    }
    setDevTokenCookies(headers, {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
    })

    return redirectAfterSignIn(request, payload.accessToken, headers)
}

function readFormString(formData: FormData, key: string): string {
    const value = formData.get(key)
    return typeof value === "string" ? value : ""
}

function buildLocalSignInAction(url: URL): string {
    const params = new URLSearchParams()

    for (const key of ["redirect", "email", "login_hint"] as const) {
        const value = url.searchParams.get(key)
        if (value) params.set(key, value)
    }

    const query = params.toString()
    return query ? `/sign-in?${query}` : "/sign-in"
}

function redirectToSignInError(
    request: Request,
    error: NonNullable<v.InferOutput<typeof signInErrorCodeSchema>>,
    email: string
): Response {
    const url = new URL("/sign-in", request.url)
    const sourceUrl = new URL(request.url)
    const redirect = sourceUrl.searchParams.get("redirect")
    if (redirect) url.searchParams.set("redirect", redirect)
    if (email) url.searchParams.set("email", email)
    url.searchParams.set("error", error)
    return Response.redirect(url.toString(), 303)
}

async function redirectAfterSignIn(
    request: Request,
    accessToken: string,
    headers: Headers
): Promise<Response> {
    const url = new URL(request.url)
    const target = await resolvePostAuthPath(accessToken, url.searchParams.get("redirect"))
    headers.set("Location", target)
    return new Response(null, { headers, status: 303 })
}
