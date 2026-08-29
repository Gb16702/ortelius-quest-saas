import { describe, expect, it } from "bun:test"
import type * as v from "valibot"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    AssignableRoleSchema,
    canManageRequests,
    getAssignableRoles,
    getRoleLabel,
    getRoleLevel,
    isAdminOrOwner,
    parseRole,
    ROLE_OPTIONS,
    ROLE_OPTIONS_WITH_DESCRIPTION,
    ROLE_OPTIONS_WITH_OWNER,
    RoleSchema,
} from "../access.permissions"

type Role = v.InferOutput<typeof RoleSchema>

const ALL_ROLES: Role[] = ["member", "admin", "owner"]

// ---------------------------------------------------------------------------
// RoleSchema
// ---------------------------------------------------------------------------

describe("RoleSchema", () => {
    it.each(ALL_ROLES)("accepts valid role '%s'", (role) => {
        expect(safeParseSchema(RoleSchema, role).success).toBe(true)
    })

    it("rejects invalid role strings", () => {
        expect(safeParseSchema(RoleSchema, "viewer").success).toBe(false)
        expect(safeParseSchema(RoleSchema, "superadmin").success).toBe(false)
        expect(safeParseSchema(RoleSchema, "").success).toBe(false)
    })

    it("rejects non-string inputs", () => {
        expect(safeParseSchema(RoleSchema, undefined).success).toBe(false)
        expect(safeParseSchema(RoleSchema, null).success).toBe(false)
        expect(safeParseSchema(RoleSchema, 42).success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// AssignableRoleSchema
// ---------------------------------------------------------------------------

describe("AssignableRoleSchema", () => {
    it("accepts assignable roles", () => {
        expect(safeParseSchema(AssignableRoleSchema, "member").success).toBe(true)
        expect(safeParseSchema(AssignableRoleSchema, "admin").success).toBe(true)
    })

    it("rejects owner as not assignable", () => {
        expect(safeParseSchema(AssignableRoleSchema, "owner").success).toBe(false)
    })

    it("rejects invalid strings and non-string inputs", () => {
        expect(safeParseSchema(AssignableRoleSchema, "viewer").success).toBe(false)
        expect(safeParseSchema(AssignableRoleSchema, undefined).success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// ROLE_OPTIONS
// ---------------------------------------------------------------------------

describe("ROLE_OPTIONS", () => {
    it("contains only assignable roles (member and admin)", () => {
        const values = ROLE_OPTIONS.map((o) => o.value)
        expect(values).toContain("member")
        expect(values).toContain("admin")
        expect(values).not.toContain("owner")
    })

    it("every option has a non-empty label", () => {
        for (const option of ROLE_OPTIONS) {
            expect(option.label.length).toBeGreaterThan(0)
        }
    })

    it("every value is a valid AssignableRole", () => {
        for (const option of ROLE_OPTIONS) {
            expect(safeParseSchema(AssignableRoleSchema, option.value).success).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// ROLE_OPTIONS_WITH_OWNER
// ---------------------------------------------------------------------------

describe("ROLE_OPTIONS_WITH_OWNER", () => {
    it("contains all three roles", () => {
        const values = ROLE_OPTIONS_WITH_OWNER.map((o) => o.value)
        expect(values).toContain("member")
        expect(values).toContain("admin")
        expect(values).toContain("owner")
    })

    it("every option has a non-empty label", () => {
        for (const option of ROLE_OPTIONS_WITH_OWNER) {
            expect(option.label.length).toBeGreaterThan(0)
        }
    })

    it("every value is a valid Role", () => {
        for (const option of ROLE_OPTIONS_WITH_OWNER) {
            expect(safeParseSchema(RoleSchema, option.value).success).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// ROLE_OPTIONS_WITH_DESCRIPTION
// ---------------------------------------------------------------------------

describe("ROLE_OPTIONS_WITH_DESCRIPTION", () => {
    it("contains only assignable roles (member and admin)", () => {
        const values = ROLE_OPTIONS_WITH_DESCRIPTION.map((o) => o.value)
        expect(values).toContain("member")
        expect(values).toContain("admin")
        expect(values).not.toContain("owner")
    })

    it("every option has a non-empty description", () => {
        for (const option of ROLE_OPTIONS_WITH_DESCRIPTION) {
            expect(option.description.length).toBeGreaterThan(0)
        }
    })

    it("every value is a valid AssignableRole", () => {
        for (const option of ROLE_OPTIONS_WITH_DESCRIPTION) {
            expect(safeParseSchema(AssignableRoleSchema, option.value).success).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// parseRole
// ---------------------------------------------------------------------------

describe("parseRole", () => {
    it.each(ALL_ROLES)("returns the role for valid role string '%s'", (role) => {
        expect(parseRole(role)).toBe(role)
    })

    it("is case-insensitive — normalizes to lowercase", () => {
        expect(parseRole("ADMIN")).toBe("admin")
        expect(parseRole("Owner")).toBe("owner")
        expect(parseRole("MEMBER")).toBe("member")
    })

    it("returns null for an unrecognized string", () => {
        expect(parseRole("viewer")).toBeNull()
        expect(parseRole("superadmin")).toBeNull()
        expect(parseRole("")).toBeNull()
    })

    it("returns null for non-string inputs", () => {
        expect(parseRole(undefined)).toBeNull()
        expect(parseRole(null)).toBeNull()
        expect(parseRole(42)).toBeNull()
        expect(parseRole({})).toBeNull()
        expect(parseRole([])).toBeNull()
        expect(parseRole(true)).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// isAdminOrOwner
// ---------------------------------------------------------------------------

describe("isAdminOrOwner", () => {
    it("returns true for admin", () => {
        expect(isAdminOrOwner("admin")).toBe(true)
    })

    it("returns true for owner", () => {
        expect(isAdminOrOwner("owner")).toBe(true)
    })

    it("returns false for member", () => {
        expect(isAdminOrOwner("member")).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// canManageRequests
// ---------------------------------------------------------------------------

describe("canManageRequests", () => {
    // Any authenticated organization member (owner, admin, member) may manage
    // any request inside their organization. The org-scope and authentication
    // gates live in `getRequestActionPolicy`; this helper is the role-level
    // predicate and currently returns true unconditionally. Kept as a seam so
    // a future policy change can be driven TDD-style from this assertion.
    it("returns true (every organization role can manage requests)", () => {
        expect(canManageRequests()).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// getAssignableRoles
// ---------------------------------------------------------------------------

describe("getAssignableRoles", () => {
    it("returns non-empty assignable roles list for admin", () => {
        const roles = getAssignableRoles("admin")
        expect(roles.length).toBeGreaterThan(0)
        expect(roles).toEqual(ROLE_OPTIONS)
    })

    it("returns non-empty assignable roles list for owner", () => {
        const roles = getAssignableRoles("owner")
        expect(roles.length).toBeGreaterThan(0)
        expect(roles).toEqual(ROLE_OPTIONS)
    })

    it("returns empty list for member", () => {
        expect(getAssignableRoles("member")).toEqual([])
    })

    it("assignable roles returned for admin/owner do not include owner itself", () => {
        for (const role of ["admin", "owner"] as Role[]) {
            const values = getAssignableRoles(role).map((o) => o.value)
            expect(values).not.toContain("owner")
        }
    })
})

// ---------------------------------------------------------------------------
// getRoleLevel
// ---------------------------------------------------------------------------

describe("getRoleLevel", () => {
    it("member has the lowest level (1)", () => {
        expect(getRoleLevel("member")).toBe(1)
    })

    it("admin has a higher level than member", () => {
        expect(getRoleLevel("admin")).toBeGreaterThan(getRoleLevel("member"))
    })

    it("owner has the highest level", () => {
        expect(getRoleLevel("owner")).toBeGreaterThan(getRoleLevel("admin"))
    })

    it("all roles have distinct levels", () => {
        const levels = ALL_ROLES.map(getRoleLevel)
        expect(new Set(levels).size).toBe(ALL_ROLES.length)
    })

    it("returns a positive integer for every role", () => {
        for (const role of ALL_ROLES) {
            const level = getRoleLevel(role)
            expect(Number.isInteger(level)).toBe(true)
            expect(level).toBeGreaterThan(0)
        }
    })
})

// ---------------------------------------------------------------------------
// getRoleLabel
// ---------------------------------------------------------------------------

describe("getRoleLabel", () => {
    it.each(ALL_ROLES)("returns a non-empty label for role '%s'", (role) => {
        const label = getRoleLabel(role)
        expect(typeof label).toBe("string")
        expect(label.length).toBeGreaterThan(0)
    })

    it("member label is 'Member'", () => {
        expect(getRoleLabel("member")).toBe("Member")
    })

    it("admin label is 'Admin'", () => {
        expect(getRoleLabel("admin")).toBe("Admin")
    })

    it("owner label is 'Owner'", () => {
        expect(getRoleLabel("owner")).toBe("Owner")
    })
})
