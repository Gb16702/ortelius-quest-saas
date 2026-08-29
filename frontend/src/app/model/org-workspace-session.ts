import { notFound, redirect } from "@tanstack/react-router"
import type { TanstackRouterContext } from "@/app/model/router.context"
import { isAdminOrOwner, type Role } from "@/entities/access"
import type { ActiveOrganization, SessionResponse, User } from "@/entities/session"
import type { OrgLayoutShellData } from "@/widgets/layout"
import {
    type OrgWorkspaceBootstrapResult,
    readOrgWorkspaceBootstrap,
} from "./private-shell-bootstrap"

interface OrgWorkspaceLocation {
    href: string
}

interface OrgWorkspaceRouteInput {
    context: TanstackRouterContext
    location: OrgWorkspaceLocation
    slug: string | undefined
}

interface OrgWorkspaceRouteDependencies {
    readBootstrap: (
        context: TanstackRouterContext,
        slug: string
    ) => Promise<OrgWorkspaceBootstrapResult>
}

export interface OrgWorkspaceRouteContext {
    sessionData: SessionResponse
    user: User
    activeOrganization: ActiveOrganization
    orgLayoutData: OrgLayoutShellData
    currentUserRole: Role
}

const defaultDependencies: OrgWorkspaceRouteDependencies = {
    readBootstrap: readOrgWorkspaceBootstrap,
}

export async function loadOrgWorkspaceRouteContext(
    input: OrgWorkspaceRouteInput,
    dependencies: OrgWorkspaceRouteDependencies = defaultDependencies
): Promise<OrgWorkspaceRouteContext> {
    const slug = input.slug?.trim()
    if (!slug) {
        throw notFound()
    }

    const bootstrap = await dependencies.readBootstrap(input.context, slug)

    if (bootstrap.kind !== "ok") {
        if (bootstrap.kind === "unauthenticated") {
            throw redirect({
                to: "/sign-in",
                search: { redirect: input.location.href },
                replace: true,
            })
        }

        if (bootstrap.kind === "not-found") {
            throw notFound()
        }

        throw redirect({
            to: "/me/requests",
            replace: true,
        })
    }

    const organization = bootstrap.organization
    if (organization.slug !== slug) {
        throw redirect({
            href: rewriteOrgSlugHref(input.location.href, slug, organization.slug),
            replace: true,
        })
    }

    return {
        sessionData: bootstrap.sessionData,
        user: bootstrap.user,
        activeOrganization: bootstrap.activeOrganization,
        orgLayoutData: {
            org: {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                logo: organization.logo,
                brandColor: organization.brandColor,
                font: organization.font,
                memberCount: organization.memberCount,
            },
            role: bootstrap.currentUserRole,
            slug: organization.slug,
        },
        currentUserRole: bootstrap.currentUserRole,
    }
}

function rewriteOrgSlugHref(href: string, fromSlug: string, toSlug: string): string {
    const prefix = `/org/${fromSlug}`
    if (!href.startsWith(prefix)) {
        return `/org/${toSlug}`
    }

    return `/org/${toSlug}${href.slice(prefix.length)}`
}

export function requireOrgAdminRoute(context: { currentUserRole?: Role | null }): void {
    if (!context.currentUserRole || !isAdminOrOwner(context.currentUserRole)) {
        throw redirect({
            to: "/me/requests",
            replace: true,
        })
    }
}
