import { describe, expect, it } from "bun:test"

describe("jest-dom polyfill", () => {
    it("produces a non-crashing failure message when a jest-dom matcher fails", () => {
        const node = document.createElement("span")
        node.textContent = "actual content"

        let errorMessage = ""
        try {
            expect(node).toHaveTextContent("expected content")
        } catch (caught) {
            errorMessage = caught instanceof Error ? caught.message : String(caught)
        }

        expect(errorMessage).toContain("toHaveTextContent")
        expect(errorMessage).toContain("expected content")
        expect(errorMessage).toContain("actual content")
    })

    it("still passes a jest-dom matcher when the assertion holds", () => {
        const node = document.createElement("span")
        node.textContent = "hello"
        expect(node).toHaveTextContent("hello")
    })
})
