import { describe, expect, it } from "bun:test"
import { createInvitationsListSearchParams } from "../invitation-list-request"

describe("createInvitationsListSearchParams", () => {
    it("maps invitation search text to the email API filter", () => {
        const params = createInvitationsListSearchParams({
            page: 2,
            limit: 25,
            search: "ada@example.com",
            role: "",
            status: "",
        })

        expect(params.get("page")).toBe("2")
        expect(params.get("limit")).toBe("25")
        expect(params.get("email")).toBe("ada@example.com")
        expect(params.has("search")).toBe(false)
    })

    it("keeps invitation role and status filters unchanged", () => {
        const params = createInvitationsListSearchParams({
            page: 1,
            limit: 20,
            search: "",
            role: "admin,member",
            status: "archived",
        })

        expect(params.get("role")).toBe("admin,member")
        expect(params.get("status")).toBe("archived")
    })
})
