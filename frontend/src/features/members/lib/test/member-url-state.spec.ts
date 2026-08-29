import { describe, expect, it } from "bun:test"
import {
    compoundParsers,
    isDefaultInvitationsPageSearchParams,
    isDefaultMembersPageSearchParams,
} from "../member-url.state"

describe("member URL state", () => {
    it("normalizes member pagination and status filters", () => {
        const parsers = compoundParsers.membersPageState

        expect(parsers.page.parseServerSide("-5")).toBe(1)
        expect(parsers.limit.parseServerSide("100000")).toBe(10)
        expect(parsers.status.parseServerSide("pending,accepted,pending")).toBe("accepted,pending")
    })

    it("normalizes invitation pagination and status filters", () => {
        const parsers = compoundParsers.invitationsPageState

        expect(parsers.page.parseServerSide("0")).toBe(1)
        expect(parsers.limit.parseServerSide("15")).toBe(15)
        expect(parsers.status.parseServerSide("archived,pending,pending")).toBe("pending,archived")
    })

    it("detects only default members page search params for route initial data", () => {
        expect(isDefaultMembersPageSearchParams(new URLSearchParams())).toBe(true)
        expect(isDefaultMembersPageSearchParams(new URLSearchParams("page=1&limit=10"))).toBe(true)
        expect(isDefaultMembersPageSearchParams(new URLSearchParams("page=2"))).toBe(false)
        expect(isDefaultMembersPageSearchParams(new URLSearchParams("search=alice"))).toBe(false)
        expect(isDefaultMembersPageSearchParams(new URLSearchParams("role=admin"))).toBe(false)
    })

    it("detects only default invitations page search params for route initial data", () => {
        expect(isDefaultInvitationsPageSearchParams(new URLSearchParams())).toBe(true)
        expect(isDefaultInvitationsPageSearchParams(new URLSearchParams("page=1&limit=10"))).toBe(
            true
        )
        expect(isDefaultInvitationsPageSearchParams(new URLSearchParams("page=2"))).toBe(false)
        expect(isDefaultInvitationsPageSearchParams(new URLSearchParams("search=alice"))).toBe(
            false
        )
        expect(isDefaultInvitationsPageSearchParams(new URLSearchParams("status=pending"))).toBe(
            false
        )
    })
})
