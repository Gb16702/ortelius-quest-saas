import { redirect } from "@tanstack/react-router"
import { isAuthenticatedMeRouteSession, type MeRouteSession } from "./me-route-session"

interface SignInRedirectTarget {
    kind: "sign-in"
    replace: true
    to: "/sign-in"
}

interface PersonalRequestsRedirectTarget {
    kind: "personal-requests"
    replace: true
    to: "/me/requests"
}

interface OrganizationRequestsRedirectTarget {
    kind: "organization-requests"
    params: { slug: string }
    replace: true
    to: "/org/$slug/requests"
}

export type RootRedirectTarget =
    | SignInRedirectTarget
    | PersonalRequestsRedirectTarget
    | OrganizationRequestsRedirectTarget

export function getRootRedirectTarget(session: MeRouteSession): RootRedirectTarget {
    if (!isAuthenticatedMeRouteSession(session)) {
        return {
            kind: "sign-in",
            replace: true,
            to: "/sign-in",
        }
    }

    const activeOrganizationSlug = session.activeOrganization?.slug
    if (activeOrganizationSlug) {
        return {
            kind: "organization-requests",
            params: { slug: activeOrganizationSlug },
            replace: true,
            to: "/org/$slug/requests",
        }
    }

    return {
        kind: "personal-requests",
        replace: true,
        to: "/me/requests",
    }
}

export function redirectRootIndex(session: MeRouteSession): never {
    const target = getRootRedirectTarget(session)

    if (target.kind === "organization-requests") {
        throw redirect({
            params: target.params,
            replace: target.replace,
            to: target.to,
        })
    }

    if (target.kind === "personal-requests") {
        throw redirect({
            replace: target.replace,
            to: target.to,
        })
    }

    throw redirect({
        replace: target.replace,
        to: target.to,
    })
}
