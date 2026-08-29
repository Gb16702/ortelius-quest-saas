import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { invoiceListResponseSchema } from "../../model/schemas/invoice.schema"
import { invoicesHandlers } from "./invoices-handlers"

describe("settings invoices handlers contract", () => {
    setupMswServer(...invoicesHandlers)

    it("returns an /api/subscription/invoices payload that parses through invoiceListResponseSchema", async () => {
        const response = await fetch("http://localhost/api/subscription/invoices")
        const payload = await response.json()
        expect(() => parseSchema(invoiceListResponseSchema, payload)).not.toThrow()
    })
})
