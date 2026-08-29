import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
// Schema-only contract test for the external auth service's `/auth/me` endpoint.
//
// Why this is not an MSW handler:
// The production fetch hits `${AUTH_URL}/auth/me` (see
// `src/features/auth/api/auth.ts`), an absolute URL whose host is bound to the
// runtime `AUTH_URL` env var. MSW Node mode intercepts by absolute URL, so a
// relative handler like `http.get("/auth/me", ...)` in `authHandlers` would
// not match — that is documented in `src/shared/test/AGENTS.md` under
// "Contract drift debt". Route-level integration tests that exercise this path
// must inline `server.use(http.get(absoluteUrl, ...))` per-test.
//
// This spec covers the contract gap by parsing realistic payloads through the
// real consumer schema. Any backend change to the `/auth/me` shape that breaks
// `authMeResponseSchema` will fail here.

import { describe, expect, it } from "bun:test"
import { authMeResponseSchema } from "@/entities/session"
import { createAuthMeResponse } from "../../model/test/auth-me.factory"

describe("authMeResponseSchema contract", () => {
    it("parses a realistic `/auth/me` payload built from the identity fixtures", () => {
        expect(() => parseSchema(authMeResponseSchema, createAuthMeResponse())).not.toThrow()
    })

    it("parses an `/auth/me` payload missing the optional accessToken (logged-out refresh)", () => {
        const payload = createAuthMeResponse({ accessToken: undefined })
        const parsed = parseSchema(authMeResponseSchema, payload)
        expect(parsed.accessToken).toBeUndefined()
        expect(parsed.sub).toBe(payload.sub)
    })

    it("parses an `/auth/me` payload missing the optional email and name (token-only refresh)", () => {
        const payload = createAuthMeResponse({ email: undefined, name: undefined })
        const parsed = parseSchema(authMeResponseSchema, payload)
        expect(parsed.email).toBeUndefined()
        expect(parsed.name).toBeUndefined()
    })

    it("passes unknown server fields through without stripping", () => {
        const payload = {
            ...createAuthMeResponse(),
            unknownBackendField: "future-claim",
        }
        const parsed = parseSchema(authMeResponseSchema, payload) as Record<string, unknown>
        expect(parsed.unknownBackendField).toBe("future-claim")
    })

    it("rejects a payload missing the required `sub` claim", () => {
        const { sub: _omitSub, ...rest } = createAuthMeResponse()
        const result = safeParseSchema(authMeResponseSchema, rest)
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes("sub"))).toBe(true)
        }
    })
})
