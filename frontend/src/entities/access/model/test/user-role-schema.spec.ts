import { describe, expect, it } from "bun:test"
import { parseNullableUserRoleResponse, parseUserRoleResponse } from "../user-role.schema"

describe("user role response parsing", () => {
    it("normalizes role casing from successful responses", () => {
        expect(
            parseUserRoleResponse({
                success: true,
                data: { role: "OWNER" },
            })
        ).toBe("owner")
    })

    it("returns null for explicit failure responses", () => {
        expect(
            parseNullableUserRoleResponse({
                success: false,
                data: { role: "admin" },
            })
        ).toBeNull()
    })

    it("throws when a required current-user role is absent", () => {
        expect(() => parseUserRoleResponse({ success: true, data: { role: null } })).toThrow(
            "User role response did not include a usable role"
        )
    })
})
