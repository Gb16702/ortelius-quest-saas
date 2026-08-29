import { describe, expect, it } from "bun:test"
import { QueryClient } from "@tanstack/react-query"
import { isNotFound, isRedirect } from "@tanstack/react-router"
import * as v from "valibot"
import type { TanstackRouterContext } from "@/app/model/router.context"
import type { Role } from "@/entities/access"
import type { OrganizationLayoutInfo } from "@/entities/organization"
import type { ActiveOrganization, SessionResponse, User } from "@/entities/session"
import { loadOrgWorkspaceRouteContext, requireOrgAdminRoute } from "../org-workspace-session"

type LoadInput = Parameters<typeof loadOrgWorkspaceRouteContext>[0]
type LoadDependencies = NonNullable<Parameters<typeof loadOrgWorkspaceRouteContext>[1]>
type PublicEnv = TanstackRouterContext["publicEnv"]

const publicEnv: PublicEnv = {
    API_URL: "https://api.example.test",
    WS_URL: "wss://api.example.test",
    PORTAL_ACCOUNT_URL: "https://portal.example.test",
    UMAMI_URL: undefined,
    UMAMI_WEBSITE_ID: undefined,
    STRIPE_PUBLISHABLE_KEY: undefined,
    GMAPS_KEY: undefined,
    E2E_EXPOSE_PC: false,
}

const user: User = {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.test",
    emailVerified: true,
    image: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    twoFactorEnabled: false,
    stripeCustomerId: null,
    role: "member",
    dominantColor: null,
}

const organization: OrganizationLayoutInfo = {
    id: "org-1",
    name: "Acme",
    slug: "acme",
    logo: null,
    brandColor: "#0103B8",
    font: "geist",
    tagline: "Build things",
    memberCount: 123,
}

const activeOrganization: ActiveOrganization = {
    ...organization,
    brandLogo: organization.logo,
}

const sessionData: SessionResponse = {
    user,
    session: { activeOrganizationId: organization.id },
    accessToken: "token",
}

const redirectErrorSchema = v.object({
    options: v.object({
        to: v.optional(v.string()),
        href: v.optional(v.string()),
        replace: v.optional(v.boolean()),
        search: v.optional(v.unknown()),
    }),
})

function createInput(slug = "acme"): LoadInput {
    return {
        context: {
            queryClient: new QueryClient(),
            sessionData: null,
            user: null,
            activeOrganization: null,
            publicEnv,
            requestOrigin: "https://app.example.test",
        },
        location: { href: "/org/acme/dashboard?joined=true" },
        slug,
    }
}

function createDependencies(role: Role): LoadDependencies {
    return {
        readBootstrap: async () => ({
            kind: "ok",
            sessionData,
            user,
            activeOrganization,
            organization,
            currentUserRole: role,
        }),
    }
}

function createDependenciesWithOrganization(
    input: Partial<OrganizationLayoutInfo>
): LoadDependencies {
    return {
        readBootstrap: async () => ({
            kind: "ok",
            sessionData,
            user,
            activeOrganization: { ...activeOrganization, ...input },
            organization: { ...organization, ...input },
            currentUserRole: "admin",
        }),
    }
}

describe("org workspace route session", () => {
    it("redirects unauthenticated bootstrap results to sign-in", async () => {
        try {
            await loadOrgWorkspaceRouteContext(createInput(), {
                readBootstrap: async () => ({ kind: "unauthenticated" }),
            })
        } catch (error) {
            expect(isRedirect(error)).toBe(true)
            const redirectError = v.parse(redirectErrorSchema, error)

            expect(redirectError.options).toMatchObject({
                to: "/sign-in",
                replace: true,
                search: { redirect: "/org/acme/dashboard?joined=true" },
            })
            return
        }

        throw new Error("Expected unauthenticated org workspace visit to redirect")
    })

    it("redirects forbidden bootstrap results away from the workspace", async () => {
        try {
            await loadOrgWorkspaceRouteContext(createInput(), {
                readBootstrap: async () => ({ kind: "forbidden" }),
            })
        } catch (error) {
            expect(isRedirect(error)).toBe(true)
            const redirectError = v.parse(redirectErrorSchema, error)

            expect(redirectError.options).toMatchObject({
                to: "/me/requests",
                replace: true,
            })
            return
        }

        throw new Error("Expected forbidden org workspace visit to redirect")
    })

    it("throws notFound for unknown organization bootstrap results", async () => {
        try {
            await loadOrgWorkspaceRouteContext(createInput(), {
                readBootstrap: async () => ({ kind: "not-found" }),
            })
        } catch (error) {
            expect(isNotFound(error)).toBe(true)
            return
        }

        throw new Error("Expected unknown org workspace visit to throw notFound")
    })

    it("hydrates organization layout context with the current role", async () => {
        const routeContext = await loadOrgWorkspaceRouteContext(
            createInput(),
            createDependencies("admin")
        )

        expect(routeContext.sessionData.session?.activeOrganizationId).toBe("org-1")
        expect(routeContext.activeOrganization.slug).toBe("acme")
        expect(routeContext.orgLayoutData.org.name).toBe("Acme")
        expect(routeContext.orgLayoutData.org.memberCount).toBe(123)
        expect(routeContext.currentUserRole).toBe("admin")
    })

    it("redirects old organization slugs to the current slug while preserving the workspace path", async () => {
        try {
            await loadOrgWorkspaceRouteContext(
                {
                    ...createInput("old-acme"),
                    location: { href: "/org/old-acme/settings/branding?tab=url" },
                },
                createDependenciesWithOrganization({ slug: "acme" })
            )
        } catch (error) {
            expect(isRedirect(error)).toBe(true)
            const redirectError = v.parse(redirectErrorSchema, error)

            expect(redirectError.options).toMatchObject({
                href: "/org/acme/settings/branding?tab=url",
                replace: true,
            })
            return
        }

        throw new Error("Expected old org slug visit to redirect")
    })

    it("keeps admin-only route access local to the protected route", () => {
        expect(() => requireOrgAdminRoute({ currentUserRole: "admin" })).not.toThrow()
        expect(() => requireOrgAdminRoute({ currentUserRole: "owner" })).not.toThrow()

        try {
            requireOrgAdminRoute({ currentUserRole: "member" })
        } catch (error) {
            expect(isRedirect(error)).toBe(true)
            const redirectError = v.parse(redirectErrorSchema, error)

            expect(redirectError.options).toMatchObject({
                to: "/me/requests",
                replace: true,
            })
            return
        }

        throw new Error("Expected non-admin org workspace visit to redirect")
    })
})
