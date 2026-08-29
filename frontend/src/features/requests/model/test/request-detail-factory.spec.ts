import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { requestDetailResponseSchema, requestDetailSchema } from "../schemas/request.schema"
import { createRequestDetail } from "./request-detail.factory"

describe("request detail factory contract", () => {
    it("produces an object that parses cleanly through requestDetailSchema", () => {
        expect(() => parseSchema(requestDetailSchema, createRequestDetail())).not.toThrow()
    })

    it("parses inside the response envelope used by the detail endpoint", () => {
        expect(() =>
            parseSchema(requestDetailResponseSchema, { data: createRequestDetail() })
        ).not.toThrow()
    })
})
