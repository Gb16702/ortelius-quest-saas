import { describe, expect, it } from "bun:test"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { parseMemberProfileResponse, parseMembersResponse } from "../../model/member.schema"
import { membersHandlers } from "./members-handlers"

describe("members handlers contract", () => {
    setupMswServer(...membersHandlers)

    it("returns a members list payload that parses through parseMembersResponse", async () => {
        const response = await fetch("http://localhost/api/organizations/organization-1/members")
        const payload = await response.json()
        expect(() => parseMembersResponse(payload, { page: 1, limit: 20 })).not.toThrow()
    })

    it("returns a member profile payload that parses through parseMemberProfileResponse", async () => {
        const response = await fetch("http://localhost/api/members/user-1/profile")
        const payload = await response.json()
        expect(() => parseMemberProfileResponse(payload)).not.toThrow()
    })
})
