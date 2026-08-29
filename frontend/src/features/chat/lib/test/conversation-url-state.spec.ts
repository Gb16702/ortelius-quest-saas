import { describe, expect, it } from "bun:test"
import { compoundParsers } from "../conversation-url.state"

describe("conversation URL state — search parser", () => {
    const { search } = compoundParsers.conversationsPageState

    it("returns the default empty string when the query key is absent", () => {
        expect(search.parseServerSide(undefined)).toBe("")
    })

    it("round-trips a non-empty search term through serialize → parseServerSide", () => {
        const term = "invoice 42"
        const serialized = search.serialize(term)
        expect(search.parseServerSide(serialized)).toBe(term)
    })

    it("returns the empty string default for an explicit empty string value", () => {
        expect(search.parseServerSide("")).toBe("")
    })

    it("preserves arbitrary printable characters in the search term", () => {
        const term = "hello & world"
        expect(search.parseServerSide(term)).toBe(term)
    })
})

describe("conversation URL state — filter parser", () => {
    const { filter } = compoundParsers.conversationsPageState

    it("returns the 'all' default when the query key is absent", () => {
        expect(filter.parseServerSide(undefined)).toBe("all")
    })

    it("accepts 'all' as a valid filter value", () => {
        expect(filter.parseServerSide("all")).toBe("all")
    })

    it("accepts 'unread' as a valid filter value", () => {
        expect(filter.parseServerSide("unread")).toBe("unread")
    })

    it("falls back to the 'all' default for an unknown filter string", () => {
        expect(filter.parseServerSide("archived")).toBe("all")
    })

    it("falls back to the 'all' default for an empty string", () => {
        expect(filter.parseServerSide("")).toBe("all")
    })

    it("round-trips 'unread' through serialize → parseServerSide", () => {
        const value = "unread" as const
        const serialized = filter.serialize(value)
        expect(filter.parseServerSide(serialized)).toBe("unread")
    })
})

describe("conversation URL state — type parser", () => {
    const { type } = compoundParsers.conversationsPageState

    it("returns the 'all' default when the query key is absent", () => {
        expect(type.parseServerSide(undefined)).toBe("all")
    })

    it("accepts supported conversation type filters", () => {
        expect(type.parseServerSide("team")).toBe("team")
        expect(type.parseServerSide("member_dm")).toBe("member_dm")
        expect(type.parseServerSide("requester")).toBe("requester")
    })

    it("falls back to the 'all' default for an unknown type filter", () => {
        expect(type.parseServerSide("archived")).toBe("all")
    })

    it("round-trips 'member_dm' through serialize → parseServerSide", () => {
        const value = "member_dm" as const
        const serialized = type.serialize(value)
        expect(type.parseServerSide(serialized)).toBe("member_dm")
    })
})

describe("conversation URL state — parser defaults", () => {
    it("exposes the correct defaultValue for the search parser", () => {
        expect(compoundParsers.conversationsPageState.search.defaultValue).toBe("")
    })

    it("exposes the correct defaultValue for the filter parser", () => {
        expect(compoundParsers.conversationsPageState.filter.defaultValue).toBe("all")
    })

    it("exposes the correct defaultValue for the type parser", () => {
        expect(compoundParsers.conversationsPageState.type.defaultValue).toBe("all")
    })

    it("exposes the correct defaultValue for the sort parser", () => {
        expect(compoundParsers.conversationsPageState.sort.defaultValue).toBe("newest")
    })

    it("clears search from the URL when it equals the default", () => {
        expect(compoundParsers.conversationsPageState.search.clearOnDefault).toBe(true)
    })

    it("clears filter from the URL when it equals the default ('all')", () => {
        // Keeps URLs canonical: `/chats` instead of `/chats?filter=all` for the
        // default view. Aligns with the `search` parser's behavior.
        expect(compoundParsers.conversationsPageState.filter.clearOnDefault).toBe(true)
    })

    it("clears type from the URL when it equals the default ('all')", () => {
        expect(compoundParsers.conversationsPageState.type.clearOnDefault).toBe(true)
    })

    it("clears sort from the URL when it equals the default ('newest')", () => {
        expect(compoundParsers.conversationsPageState.sort.clearOnDefault).toBe(true)
    })
})

describe("conversation URL state — sort parser", () => {
    const { sort } = compoundParsers.conversationsPageState

    it("returns the 'newest' default when the query key is absent", () => {
        expect(sort.parseServerSide(undefined)).toBe("newest")
    })

    it("accepts supported sort values", () => {
        expect(sort.parseServerSide("newest")).toBe("newest")
        expect(sort.parseServerSide("oldest")).toBe("oldest")
    })

    it("falls back to the 'newest' default for an unknown sort", () => {
        expect(sort.parseServerSide("popular")).toBe("newest")
    })
})
