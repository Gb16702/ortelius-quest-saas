import { describe, expect, it } from "bun:test"

import { serializeCsvCell } from "../csv"

describe("serializeCsvCell", () => {
    it("converts nullish values to empty CSV cells", () => {
        expect(serializeCsvCell(null)).toBe("")
        expect(serializeCsvCell(undefined)).toBe("")
    })

    it("neutralizes values that spreadsheet apps may interpret as formulas", () => {
        expect(serializeCsvCell("=1+1")).toBe("'=1+1")
        expect(serializeCsvCell("+1+1")).toBe("'+1+1")
        expect(serializeCsvCell("-1+1")).toBe("'-1+1")
        expect(serializeCsvCell("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)")
        expect(serializeCsvCell("\t=1+1")).toBe("'\t=1+1")
        expect(serializeCsvCell("\r=1+1")).toBe('"\'\r=1+1"')
        expect(serializeCsvCell("\n=1+1")).toBe('"\'\n=1+1"')
    })

    it("keeps RFC-style quoting for commas, quotes, and newlines", () => {
        expect(serializeCsvCell("Acme, Inc.")).toBe('"Acme, Inc."')
        expect(serializeCsvCell('He said "hello"')).toBe('"He said ""hello"""')
        expect(serializeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"')
    })
})
