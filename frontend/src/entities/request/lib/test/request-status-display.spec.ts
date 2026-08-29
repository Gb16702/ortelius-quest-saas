import { describe, expect, it } from "bun:test"
import { getRequestStatusDisplay, requestStatusLabelKey } from "../request-status-display"

describe("getRequestStatusDisplay", () => {
    it("maps known request statuses to label keys and colors", () => {
        expect(getRequestStatusDisplay("open")).toEqual({
            colorClassName: "bg-[#FE8906]",
            labelKey: "requests:status.open",
            fallbackLabel: "Open",
        })
        expect(getRequestStatusDisplay("invoiced")).toEqual({
            colorClassName: "bg-[#00D492]",
            labelKey: "requests:status.invoiced",
            fallbackLabel: "Invoiced",
        })
    })

    it("falls back to the raw status for unknown statuses", () => {
        expect(getRequestStatusDisplay("awaiting_review")).toEqual({
            colorClassName: "bg-gray-500",
            labelKey: "awaiting_review",
            fallbackLabel: "awaiting_review",
        })
    })
})

describe("requestStatusLabelKey", () => {
    it("returns the translation key for a known status", () => {
        expect(requestStatusLabelKey("draft")).toBe("requests:status.draft")
    })

    it("returns the raw status for unknown statuses", () => {
        expect(requestStatusLabelKey("awaiting_review")).toBe("awaiting_review")
    })
})
