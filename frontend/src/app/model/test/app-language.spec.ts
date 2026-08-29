import { describe, expect, it } from "bun:test"
import type { User } from "@/entities/session"
import { getUserProfileLanguage } from "../app-language"

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

describe("private app language", () => {
    it("uses a supported profile language before server fallbacks", () => {
        expect(getUserProfileLanguage({ ...user, profile: { language: "fr" } })).toBe("fr")
    })

    it("ignores unsupported profile languages", () => {
        expect(getUserProfileLanguage({ ...user, profile: { language: "de" } })).toBeNull()
    })
})
