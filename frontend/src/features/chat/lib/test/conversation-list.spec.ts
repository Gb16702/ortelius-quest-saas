import { describe, expect, it } from "bun:test"
import { hasActiveConversationFilters } from "../conversation-list"

describe("conversation list filters", () => {
    it("treats the conversation type filter as an active filter", () => {
        expect(
            hasActiveConversationFilters({
                searchQuery: "",
                filter: "all",
                typeFilter: "member_dm",
                sort: "newest",
            })
        ).toBe(true)
    })

    it("treats the non-default sort order as an active filter", () => {
        expect(
            hasActiveConversationFilters({
                searchQuery: "",
                filter: "all",
                typeFilter: "all",
                sort: "oldest",
            })
        ).toBe(true)
    })
})
