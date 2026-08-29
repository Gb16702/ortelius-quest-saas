import { describe, expect, it } from "bun:test"
import { currentUserRoleQueryOptions, userRoleKeys } from "../user-role.query"

describe("userRoleKeys", () => {
    it("scopes current-user role data by both organization and user", () => {
        expect(
            userRoleKeys.current({
                organizationId: "org-1",
                userId: "user-1",
            })
        ).toEqual(["user-role", "current", { organizationId: "org-1", userId: "user-1" }])
    })

    it("keeps missing scope values explicit in the query key", () => {
        expect(
            userRoleKeys.current({
                organizationId: undefined,
                userId: null,
            })
        ).toEqual(["user-role", "current", { organizationId: null, userId: null }])
    })
})

describe("currentUserRoleQueryOptions", () => {
    it("uses the current-user role key", () => {
        const options = currentUserRoleQueryOptions({
            organizationId: "org-1",
            userId: "user-1",
        })

        expect(Array.from(options.queryKey)).toEqual([
            "user-role",
            "current",
            { organizationId: "org-1", userId: "user-1" },
        ])
    })
})
