import { describe, expect, it } from "bun:test"
import { buildInvoicesByRequestEndpoint } from "../hooks/use-invoice"

describe("buildInvoicesByRequestEndpoint", () => {
    it("uses the plural request invoice endpoint", () => {
        expect(buildInvoicesByRequestEndpoint("request-123")).toBe(
            "/api/invoices/request/request-123"
        )
    })

    it("encodes request ids before placing them in the path", () => {
        expect(buildInvoicesByRequestEndpoint("request/with space")).toBe(
            "/api/invoices/request/request%2Fwith%20space"
        )
    })
})
