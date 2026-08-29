import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { quoteSchema } from "../schemas/request.schema"
import { createQuote } from "./quote.factory"

describe("quote factory contract", () => {
    it("produces an object that parses cleanly through quoteSchema", () => {
        expect(() => parseSchema(quoteSchema, createQuote())).not.toThrow()
    })
})
