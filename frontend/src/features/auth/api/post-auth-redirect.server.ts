import { fetchActiveOrganization } from "./active-organization.server"

const authEntrypointPaths = new Set(["/sign-in", "/auth/post-redirect"])

export async function resolvePostAuthPath(
    accessToken: string,
    requestedRedirect?: string | null
): Promise<string> {
    if (isSafePostAuthRedirect(requestedRedirect)) {
        return requestedRedirect
    }

    const activeOrg = await fetchActiveOrganization(accessToken)
    if (activeOrg?.slug) {
        return `/org/${activeOrg.slug}/requests`
    }
    return "/me/requests"
}

function isSafePostAuthRedirect(value: string | null | undefined): value is string {
    if (!value?.startsWith("/") || value.startsWith("//")) return false

    try {
        const url = new URL(value, "https://ortelius.local")
        if (url.origin !== "https://ortelius.local") return false

        const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "")
        return !authEntrypointPaths.has(pathname)
    } catch {
        return false
    }
}
