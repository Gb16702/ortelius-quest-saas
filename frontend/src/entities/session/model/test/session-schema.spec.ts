import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    activeOrganizationResponseSchema,
    activeOrganizationSchema,
    authMeResponseSchema,
    userSchema,
} from "../session.schema"

// --- userSchema ---

describe("userSchema valid inputs", () => {
    it("accepts a complete member user", () => {
        const result = safeParseSchema(userSchema, {
            id: "user-1",
            name: "Alice",
            email: "alice@example.com",
            emailVerified: true,
            image: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            twoFactorEnabled: false,
            stripeCustomerId: null,
            role: "member",
            dominantColor: null,
        })
        expect(result.success).toBe(true)
    })

    it("accepts an admin user with image and stripeCustomerId", () => {
        const result = safeParseSchema(userSchema, {
            id: "user-2",
            name: "Bob",
            email: "bob@example.com",
            emailVerified: true,
            image: "https://cdn.example.com/bob.png",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            twoFactorEnabled: true,
            stripeCustomerId: "cus_abc123",
            role: "admin",
            dominantColor: "#3a86ff",
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.role).toBe("admin")
            expect(result.data.twoFactorEnabled).toBe(true)
        }
    })

    it("applies default role 'member' when role is omitted", () => {
        const result = safeParseSchema(userSchema, { id: "user-3" })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.role).toBe("member")
        }
    })

    it("transforms nullish image to null", () => {
        const result = safeParseSchema(userSchema, { id: "user-4", image: undefined })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.image).toBeNull()
        }
    })

    it("accepts passthrough unknown fields without throwing", () => {
        const result = safeParseSchema(userSchema, {
            id: "user-5",
            unknownServerField: "some-value",
        })
        expect(result.success).toBe(true)
    })
})

describe("userSchema invalid inputs", () => {
    it("rejects input with missing id", () => {
        const result = safeParseSchema(userSchema, { name: "No ID" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("id"))).toBe(true)
        }
    })

    it("rejects non-string id", () => {
        const result = safeParseSchema(userSchema, { id: 42 })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.path).toContain("id")
            expect(result.error.issues[0]?.code).toBe("invalid_type")
        }
    })

    it("rejects unknown role value", () => {
        const result = safeParseSchema(userSchema, { id: "user-6", role: "superuser" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("role"))).toBe(true)
        }
    })

    it("rejects non-boolean emailVerified", () => {
        const result = safeParseSchema(userSchema, { id: "user-7", emailVerified: "yes" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("emailVerified"))).toBe(true)
        }
    })

    it("rejects null as id", () => {
        const result = safeParseSchema(userSchema, { id: null })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.path).toContain("id")
        }
    })

    it("rejects completely empty object (no id)", () => {
        const result = safeParseSchema(userSchema, {})
        expect(result.success).toBe(false)
    })
})

// --- authMeResponseSchema ---

describe("authMeResponseSchema valid inputs", () => {
    it("accepts a full token payload", () => {
        const result = safeParseSchema(authMeResponseSchema, {
            sub: "auth0|user-1",
            email: "alice@example.com",
            name: "Alice",
            accessToken: "eyJhbGciOiJSUzI1NiJ9.payload.sig",
        })
        expect(result.success).toBe(true)
    })

    it("accepts sub-only minimal payload", () => {
        const result = safeParseSchema(authMeResponseSchema, { sub: "auth0|user-2" })
        expect(result.success).toBe(true)
    })

    it("accepts passthrough fields alongside sub", () => {
        const result = safeParseSchema(authMeResponseSchema, {
            sub: "auth0|user-3",
            extra: "metadata",
        })
        expect(result.success).toBe(true)
    })
})

describe("authMeResponseSchema invalid inputs", () => {
    it("rejects when sub is missing", () => {
        const result = safeParseSchema(authMeResponseSchema, { email: "alice@example.com" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("sub"))).toBe(true)
        }
    })

    it("rejects non-string sub", () => {
        const result = safeParseSchema(authMeResponseSchema, { sub: 123 })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.path).toContain("sub")
            expect(result.error.issues[0]?.code).toBe("invalid_type")
        }
    })
})

// --- activeOrganizationSchema ---

describe("activeOrganizationSchema valid inputs", () => {
    it("accepts a full organization payload", () => {
        const result = safeParseSchema(activeOrganizationSchema, {
            id: "org-1",
            name: "Acme Corp",
            slug: "acme",
            logo: "https://cdn.example.com/logo.png",
            brandLogo: null,
            tagline: "We do stuff",
            brandColor: "#ff6b6b",
        })
        expect(result.success).toBe(true)
    })

    it("accepts org with no optional fields", () => {
        const result = safeParseSchema(activeOrganizationSchema, {
            id: "org-2",
            name: "Minimorg",
            slug: null,
            logo: null,
        })
        expect(result.success).toBe(true)
    })

    it("accepts organization payloads without theme data", () => {
        const result = safeParseSchema(activeOrganizationSchema, {
            id: "org-3",
            name: "Plain Org",
            slug: "plain",
            logo: null,
        })
        expect(result.success).toBe(true)
    })

    it("accepts passthrough unknown server fields", () => {
        const result = safeParseSchema(activeOrganizationSchema, {
            id: "org-4",
            name: "Extra Org",
            slug: null,
            logo: null,
            someNewBackendField: true,
        })
        expect(result.success).toBe(true)
    })
})

describe("activeOrganizationSchema invalid inputs", () => {
    it("rejects missing id", () => {
        const result = safeParseSchema(activeOrganizationSchema, {
            name: "No ID Org",
            slug: null,
            logo: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("id"))).toBe(true)
        }
    })

    it("rejects non-string name", () => {
        const result = safeParseSchema(activeOrganizationSchema, {
            id: "org-5",
            name: 99,
            slug: null,
            logo: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(true)
        }
    })
})

// --- activeOrganizationResponseSchema ---

describe("activeOrganizationResponseSchema valid inputs", () => {
    it("accepts a response with a populated organization", () => {
        const result = safeParseSchema(activeOrganizationResponseSchema, {
            organization: {
                id: "org-1",
                name: "Acme Corp",
                slug: "acme",
                logo: null,
            },
        })
        expect(result.success).toBe(true)
    })

    it("accepts a response with null organization (no active org)", () => {
        const result = safeParseSchema(activeOrganizationResponseSchema, { organization: null })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.organization).toBeNull()
        }
    })
})

describe("activeOrganizationResponseSchema invalid inputs", () => {
    it("rejects when organization key is entirely absent", () => {
        const result = safeParseSchema(activeOrganizationResponseSchema, {})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("organization"))).toBe(true)
        }
    })

    it("rejects when organization is a string instead of object or null", () => {
        const result = safeParseSchema(activeOrganizationResponseSchema, { organization: "acme" })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("organization"))).toBe(true)
        }
    })
})
