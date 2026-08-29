import { describe, expect, it } from "bun:test"
import { activeOrganizationResponseSchema, userSchema } from "@/entities/session"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { authHandlers } from "./auth-handlers"

describe("auth handlers contract", () => {
    setupMswServer(...authHandlers)

    it("returns an /api/auth/profile payload that parses through userSchema", async () => {
        const response = await fetch("http://localhost/api/auth/profile")
        const payload = await response.json()
        expect(() => parseSchema(userSchema, payload)).not.toThrow()
    })

    it("returns an /api/onboarding/status payload that parses through activeOrganizationResponseSchema", async () => {
        const response = await fetch("http://localhost/api/onboarding/status")
        const payload = await response.json()
        expect(() => parseSchema(activeOrganizationResponseSchema, payload)).not.toThrow()
    })
})
