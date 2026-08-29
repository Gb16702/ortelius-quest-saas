import { describe, expect, it } from "bun:test"
import { generateUUID } from "../uuid"

describe("generateUUID", () => {
    it("generates a UUID v4 with Web Crypto", () => {
        expect(generateUUID()).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        )
    })
})
