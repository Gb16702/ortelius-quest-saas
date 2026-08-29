import { describe, expect, it } from "bun:test"
import {
    createCommaSeparatedEnumParser,
    createDateFromIsoDateString,
    createIsoDateStringParser,
    createPageSizeParser,
    createPositiveIntegerParser,
    DEFAULT_PAGE_SIZE,
} from "../url.state"

describe("createPositiveIntegerParser", () => {
    const parser = createPositiveIntegerParser().withDefault(1)

    it("keeps URL page values positive and canonical", () => {
        expect(parser.parseServerSide("2")).toBe(2)
        expect(parser.parseServerSide("02")).toBe(2)
        expect(parser.parseServerSide("0")).toBe(1)
        expect(parser.parseServerSide("-5")).toBe(1)
        expect(parser.parseServerSide("1.5")).toBe(1)
        expect(parser.parseServerSide("bad")).toBe(1)
    })
})

describe("createPageSizeParser", () => {
    const parser = createPageSizeParser().withDefault(DEFAULT_PAGE_SIZE)

    it("accepts only supported page sizes", () => {
        expect(parser.parseServerSide("5")).toBe(5)
        expect(parser.parseServerSide("20")).toBe(20)
        expect(parser.parseServerSide("7")).toBe(DEFAULT_PAGE_SIZE)
        expect(parser.parseServerSide("100000")).toBe(DEFAULT_PAGE_SIZE)
        expect(parser.parseServerSide("-10")).toBe(DEFAULT_PAGE_SIZE)
    })
})

describe("createIsoDateStringParser", () => {
    const parser = createIsoDateStringParser().withDefault("")

    it("accepts only real ISO date strings", () => {
        expect(parser.parseServerSide("2026-05-11")).toBe("2026-05-11")
        expect(parser.parseServerSide("2026-02-30")).toBe("")
        expect(parser.parseServerSide("2026-5-11")).toBe("")
        expect(parser.parseServerSide("not-a-date")).toBe("")
    })
})

describe("createDateFromIsoDateString", () => {
    it("creates a local Date without shifting two-digit ISO years", () => {
        expect(createDateFromIsoDateString("0001-01-02")?.getFullYear()).toBe(1)
    })
})

describe("createCommaSeparatedEnumParser", () => {
    const parser = createCommaSeparatedEnumParser(["draft", "pending", "quoted"]).withDefault("")

    it("deduplicates enum values in declaration order", () => {
        expect(parser.parseServerSide("quoted,pending,pending")).toBe("pending,quoted")
        expect(parser.parseServerSide("pending,quoted")).toBe("pending,quoted")
        expect(parser.parseServerSide("pending,unknown")).toBe("")
        expect(parser.parseServerSide("pending,")).toBe("")
    })
})
