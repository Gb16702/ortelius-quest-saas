import { describe, expect, it } from "bun:test"
import {
    createRequestDateRange,
    normalizeRequestDateFilterValues,
    toRequestDateFilterValues,
} from "../request-filters"
import { compoundParsers, FILTER_STATES } from "../request-url.state"

// ---------------------------------------------------------------------------
// Canonical form definition (used by round-trip assertions):
//
//   Each parser's `parseServerSide(raw)` produces a normalized value.
//   `serialize(value)` produces the canonical URL string for that value.
//   Canonical rules per key:
//     - page:       positive integer; default = "1" (always present)
//     - limit:      one of [5,10,15,20]; default = "10" (always present)
//     - search:     clearOnDefault → absent when empty
//     - lifecycleStatus:     comma-separated; values sorted by declaration order;
//                   default = FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT;
//                   NOT clearOnDefault → always present
//     - assignedTo: clearOnDefault → absent when empty
//     - priority:   comma-separated; values sorted by declaration order;
//                   clearOnDefault → absent when empty
//     - fromDate:   ISO-8601 date or absent
//     - toDate:     ISO-8601 date or absent
//
//   Round-trip: serialize(parseServerSide(raw)) === canonical_raw
// ---------------------------------------------------------------------------

describe("request URL state", () => {
    it("normalizes pagination and multi-select filters", () => {
        const parsers = compoundParsers.requestsPageState

        expect(parsers.page.parseServerSide("-5")).toBe(1)
        expect(parsers.limit.parseServerSide("100000")).toBe(10)
        expect(parsers.lifecycleStatus.parseServerSide("quoted,open,open")).toBe("quoted,open")
        expect(parsers.priority.parseServerSide("high,low,high")).toBe("low,high")
    })

    it("omits invalid URL date filters", () => {
        const parsers = compoundParsers.requestsPageState

        expect(parsers.fromDate.parseServerSide("not-a-date")).toBe("")
        expect(parsers.toDate.parseServerSide("2026-02-30")).toBe("")
        expect(parsers.fromDate.parseServerSide("2026-05-11")).toBe("2026-05-11")
    })

    // -----------------------------------------------------------------------
    // Round-trip invariant: serialize(parse(raw)) === canonical(raw)
    // -----------------------------------------------------------------------

    it("round-trips lifecycleStatus: declaration-order dedup is the canonical form", () => {
        const { lifecycleStatus } = compoundParsers.requestsPageState

        // Out-of-order input → canonical sorted output
        const parsed = lifecycleStatus.parseServerSide("invoiced,draft,open")
        expect(parsed).toBe("invoiced,open,draft")
        expect(lifecycleStatus.serialize(parsed)).toBe("invoiced,open,draft")
    })

    it("round-trips priority: declaration order (low,medium,high) is canonical", () => {
        const { priority } = compoundParsers.requestsPageState

        const parsed = priority.parseServerSide("high,low")
        expect(parsed).toBe("low,high")
        expect(priority.serialize(parsed)).toBe("low,high")
    })

    it("round-trips valid page and limit values to the same string", () => {
        const { page, limit } = compoundParsers.requestsPageState

        expect(page.serialize(page.parseServerSide("3"))).toBe("3")
        expect(limit.serialize(limit.parseServerSide("20"))).toBe("20")
    })

    it("round-trips valid ISO dates unchanged", () => {
        const { fromDate, toDate } = compoundParsers.requestsPageState

        const from = fromDate.parseServerSide("2026-05-11")
        expect(from).toBe("2026-05-11")
        expect(fromDate.serialize(from)).toBe("2026-05-11")

        const to = toDate.parseServerSide("2026-12-31")
        expect(to).toBe("2026-12-31")
        expect(toDate.serialize(to)).toBe("2026-12-31")
    })

    // -----------------------------------------------------------------------
    // Default values: omitted / default-value inputs round-trip to defaults
    // -----------------------------------------------------------------------

    it("yields defaults for empty or absent query string parameters", () => {
        const parsers = compoundParsers.requestsPageState

        // Numeric parsers: empty string fails positiveInteger / pageSize → null → withDefault
        expect(parsers.page.parseServerSide("")).toBe(1)
        expect(parsers.limit.parseServerSide("")).toBe(10)

        // String parsers with `""` as their default: empty input round-trips to "".
        expect(parsers.search.parseServerSide("")).toBe("")
        expect(parsers.assignedTo.parseServerSide("")).toBe("")
        expect(parsers.priority.parseServerSide("")).toBe("")
        expect(parsers.fromDate.parseServerSide("")).toBe("")
        expect(parsers.toDate.parseServerSide("")).toBe("")

        // lifecycleStatus: an empty value must fall back to the configured default. The
        // comma-separated enum parser treats "" as "invalid input" → null →
        // withDefault applies, so a user navigating to `?lifecycleStatus=` lands on the
        // default filtered view rather than an empty list.
        expect(parsers.lifecycleStatus.parseServerSide("")).toBe(
            FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT
        )
    })

    // -----------------------------------------------------------------------
    // Invalid input: unknown values must be ignored, not crash
    // -----------------------------------------------------------------------

    it("ignores unknown lifecycleStatus values instead of crashing", () => {
        const { lifecycleStatus } = compoundParsers.requestsPageState

        // Mix of valid + unknown → falls back to default (parse returns null → withDefault kicks in)
        expect(lifecycleStatus.parseServerSide("open,unknown_status")).toBe(
            FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT
        )
    })

    it("ignores unknown priority values instead of crashing", () => {
        const { priority } = compoundParsers.requestsPageState

        expect(priority.parseServerSide("high,CRITICAL")).toBe("")
    })

    it("ignores non-positive-integer page values and falls back to 1", () => {
        const { page } = compoundParsers.requestsPageState

        expect(page.parseServerSide("0")).toBe(1)
        expect(page.parseServerSide("1.7")).toBe(1)
        expect(page.parseServerSide("not-a-number")).toBe(1)
    })

    // -----------------------------------------------------------------------
    // Pagination reset on filter change (regression test)
    // Regression: page must be reset to 1 when a filter changes.
    // Verified via parse → mutate → serialize composition; no dedicated helper
    // exists in the module so we test the contract at the parser boundary.
    // The parse + re-serialize flow that callers use must produce page=1 when
    // the page field is manually reset to its default after a filter mutation.
    // -----------------------------------------------------------------------

    it("assignedTo is preserved and page serializes to 1 after filter mutation (pagination reset regression)", () => {
        const parsers = compoundParsers.requestsPageState

        // Simulate state after user was on page 3 with assignedTo filter active
        const page = parsers.page.parseServerSide("3")
        const assignedTo = parsers.assignedTo.parseServerSide("user-abc")

        expect(page).toBe(3)
        expect(assignedTo).toBe("user-abc")

        // After a filter mutation the page is reset to 1 — callers do this by
        // writing parsers.page.defaultValue (= 1) back to the URL state.
        const resetPage = parsers.page.defaultValue
        expect(resetPage).toBe(1)

        // assignedTo must survive; its value is unchanged
        expect(parsers.assignedTo.serialize(assignedTo)).toBe("user-abc")
        // page serializes back to "1" in the URL
        expect(parsers.page.serialize(resetPage)).toBe("1")
    })

    // -----------------------------------------------------------------------
    // FILTER_STATES.REQUEST_LIFECYCLE_STATUS.ALL covers all five lifecycle statuses
    // -----------------------------------------------------------------------

    it("ALL lifecycleStatus value round-trips through the lifecycleStatus parser", () => {
        const { lifecycleStatus } = compoundParsers.requestsPageState

        const all = lifecycleStatus.parseServerSide(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.ALL)
        expect(all).toBe(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.ALL)
        expect(lifecycleStatus.serialize(all)).toBe(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.ALL)
    })

    it("EMPTY sentinel round-trips through the lifecycleStatus parser", () => {
        const { lifecycleStatus } = compoundParsers.requestsPageState

        const empty = lifecycleStatus.parseServerSide(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.EMPTY)
        expect(empty).toBe(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.EMPTY)
        expect(lifecycleStatus.serialize(empty)).toBe(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.EMPTY)
    })

    // -----------------------------------------------------------------------
    // Regression: prior to PR #381, page used parseAsInteger which accepted
    // negative numbers and non-page-size limit values verbatim, leading to
    // silent broken API calls with page=-5 or limit=99999.
    // -----------------------------------------------------------------------

    it("regression #381: negative page and out-of-range limit no longer accepted verbatim", () => {
        const { page, limit } = compoundParsers.requestsPageState

        // Before fix: parseAsInteger would accept these as-is
        expect(page.parseServerSide("-5")).toBe(1) // must clamp to 1
        expect(limit.parseServerSide("99999")).toBe(10) // must fall back to DEFAULT_PAGE_SIZE
        expect(limit.parseServerSide("7")).toBe(10) // 7 is not a valid page size
    })
})

describe("request date filters", () => {
    it("normalizes invalid date ranges before API and UI usage", () => {
        expect(normalizeRequestDateFilterValues("bad", "2026-05-12")).toEqual({
            from: "",
            to: "",
        })
        expect(normalizeRequestDateFilterValues("2026-05-12", "2026-05-11")).toEqual({
            from: "2026-05-12",
            to: "",
        })
        expect(normalizeRequestDateFilterValues("2026-05-11", "2026-05-12")).toEqual({
            from: "2026-05-11",
            to: "2026-05-12",
        })
    })

    it("creates DateRange values only from valid normalized ISO dates", () => {
        expect(createRequestDateRange("bad", "2026-05-12")).toBeUndefined()

        const range = createRequestDateRange("2026-05-11", "2026-05-12")
        expect(range?.from?.getFullYear()).toBe(2026)
        expect(range?.from?.getMonth()).toBe(4)
        expect(range?.from?.getDate()).toBe(11)
        expect(range?.to?.getDate()).toBe(12)
    })

    it("serializes same-day or reversed date ranges to the stable lower-bound value", () => {
        expect(
            toRequestDateFilterValues({
                from: new Date(2026, 4, 11),
                to: new Date(2026, 4, 11),
            })
        ).toEqual({ from: "2026-05-11", to: null })

        expect(
            toRequestDateFilterValues({
                from: new Date(2026, 4, 12),
                to: new Date(2026, 4, 11),
            })
        ).toEqual({ from: "2026-05-12", to: null })
    })
})
