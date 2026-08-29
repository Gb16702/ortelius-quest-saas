import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    authSearchSchema,
    resolveCleanAuthRoutePath,
    resolveSafeAuthRedirect,
    resolveUnauthenticatedRedirectSearch,
} from "../auth-navigation"

describe("auth navigation", () => {
    it("keeps unknown unauthenticated paths as sign-in redirect targets", () => {
        expect(resolveUnauthenticatedRedirectSearch("/does-not-exist")).toEqual({
            redirect: "/does-not-exist",
        })
    })

    it("does not nest auth entrypoints as sign-in redirect targets", () => {
        expect(resolveUnauthenticatedRedirectSearch("/sign-in?redirect=%2Fdoes-not-exist")).toEqual(
            {}
        )
    })

    it("drops auth entrypoint redirects from auth route search params", () => {
        expect(
            parseSchema(authSearchSchema, {
                redirect: "/sign-in?redirect=%2Fdoes-not-exist",
            })
        ).toEqual({ redirect: undefined })
    })

    it("resolves a clean auth route path for already nested sign-in URLs", () => {
        expect(
            resolveCleanAuthRoutePath(
                new URL(
                    "http://127.0.0.1:5174/sign-in?redirect=%2Fsign-in%3Fredirect%3D%252Fdoes-not-exist&email=user%40example.test"
                )
            )
        ).toBe("/sign-in?email=user%40example.test")
    })

    it("falls back instead of redirecting authenticated users back to auth routes", () => {
        expect(
            resolveSafeAuthRedirect(
                { redirect: "/sign-in?redirect=%2Fdoes-not-exist" },
                "/me/requests"
            )
        ).toBe("/me/requests")
    })
})
