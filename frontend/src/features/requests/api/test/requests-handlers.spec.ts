import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import {
    organizationRequestsListResponseSchema,
    requestDetailResponseSchema,
} from "../../model/schemas/request.schema"
import { requestsHandlers } from "./requests-handlers"

describe("requests handlers contract", () => {
    setupMswServer(...requestsHandlers)

    it("returns an /api/requests list payload that parses through organizationRequestsListResponseSchema", async () => {
        const response = await fetch("http://localhost/api/requests")
        const payload = await response.json()
        expect(() => parseSchema(organizationRequestsListResponseSchema, payload)).not.toThrow()
    })

    it("returns an /api/requests/:id detail payload that parses through requestDetailResponseSchema", async () => {
        const response = await fetch("http://localhost/api/requests/request-1")
        const payload = await response.json()
        expect(() => parseSchema(requestDetailResponseSchema, payload)).not.toThrow()
    })

    it("returns an /api/requests/by-number/:number payload that parses through requestDetailResponseSchema", async () => {
        const response = await fetch("http://localhost/api/requests/by-number/REQ-0001")
        const payload = await response.json()
        expect(() => parseSchema(requestDetailResponseSchema, payload)).not.toThrow()
    })
})
