import { describe, expect, it } from "bun:test"
import { isRedirect } from "@tanstack/react-router"
import * as v from "valibot"
import type { ActiveOrganization, SessionResponse, User } from "@/entities/session"
import { getRootRedirectTarget, redirectRootIndex } from "../root-navigation"

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

const activeOrganization: ActiveOrganization = {
    id: "org-1",
    name: "Acme Freight",
    slug: "acme",
    logo: null,
}

const sessionData: SessionResponse = {
    accessToken: null,
    session: { activeOrganizationId: activeOrganization.id },
    user,
}

const redirectErrorSchema = v.object({
    options: v.object({
        params: v.optional(v.unknown()),
        replace: v.optional(v.boolean()),
        to: v.string(),
    }),
})

describe("root redirect target", () => {
    it("sends logged-out visits to sign-in", () => {
        expect(
            getRootRedirectTarget({
                activeOrganization: null,
                sessionData: null,
                user: null,
            })
        ).toMatchObject({
            replace: true,
            to: "/sign-in",
        })
    })

    it("sends authenticated users with an active organization to that organization's requests", () => {
        expect(
            getRootRedirectTarget({
                activeOrganization,
                sessionData,
                user,
            })
        ).toMatchObject({
            params: { slug: "acme" },
            replace: true,
            to: "/org/$slug/requests",
        })
    })

    it("sends authenticated users without an active organization to personal requests", () => {
        expect(
            getRootRedirectTarget({
                activeOrganization: null,
                sessionData,
                user,
            })
        ).toMatchObject({
            replace: true,
            to: "/me/requests",
        })
    })

    it("throws a TanStack redirect for root visits", () => {
        try {
            redirectRootIndex({
                activeOrganization,
                sessionData,
                user,
            })
        } catch (error) {
            expect(isRedirect(error)).toBe(true)
            expect(v.parse(redirectErrorSchema, error).options).toMatchObject({
                params: { slug: "acme" },
                replace: true,
                to: "/org/$slug/requests",
            })
            return
        }

        throw new Error("Expected root redirect to throw")
    })
})
