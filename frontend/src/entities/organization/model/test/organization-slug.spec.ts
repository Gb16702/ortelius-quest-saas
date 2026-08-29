import { describe, expect, it } from "bun:test"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    normalizeOrganizationSlugInput,
    organizationSlugSchema,
    slugifyOrganizationName,
} from "../organization-slug"

describe("organization slug", () => {
    it("slugifies an organization name for the default organization URL", () => {
        expect(slugifyOrganizationName("Acme Logistics BV")).toBe("acme-logistics-bv")
        expect(slugifyOrganizationName("Café & Transit")).toBe("cafe-transit")
    })

    it("normalizes manually typed slug input without allowing invalid characters", () => {
        expect(normalizeOrganizationSlugInput("Acme--Air!")).toBe("acme-air")
    })

    it("accepts lowercase URL slugs with single hyphens", () => {
        expect(parseSchema(organizationSlugSchema, "acme-air")).toBe("acme-air")
    })

    it("rejects leading, trailing, and repeated hyphens", () => {
        expect(safeParseSchema(organizationSlugSchema, "-acme").success).toBe(false)
        expect(safeParseSchema(organizationSlugSchema, "acme-").success).toBe(false)
        expect(safeParseSchema(organizationSlugSchema, "acme--air").success).toBe(false)
    })
})
