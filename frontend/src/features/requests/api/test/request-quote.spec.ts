import { describe, expect, it } from "bun:test"
import type { QuoteData } from "../../model/request"
import { buildCreateQuotePayload } from "../request-quote.mutations"

const quoteData = {
    selectedCategories: ["category-1"],
    selectedServices: [
        {
            serviceId: "service-1",
            included: true,
            price: 125,
        },
    ],
    cargoDetails: {
        weight: null,
        volume: null,
        palletCount: null,
        fragility: null,
        dimensions: {
            length: null,
            width: null,
            height: null,
        },
        options: {
            hazardous: false,
            insuranceCoverage: false,
            perishableGoods: false,
        },
    },
    description: "Please include evening delivery constraints.",
    vatRate: 21,
    totalHT: 125,
    totalTTC: 151.25,
    vatAmount: 26.25,
    legalDocumentIds: ["550e8400-e29b-41d4-a716-446655440000"],
} satisfies QuoteData

describe("buildCreateQuotePayload", () => {
    it("sends the quote feedback textarea value as the create-quote description", () => {
        const payload = buildCreateQuotePayload("request-1", quoteData)

        expect(payload).toMatchObject({
            requestId: "request-1",
            description: "Please include evening delivery constraints.",
        })
        expect(Object.hasOwn(payload, "generalFeedback")).toBe(false)
    })
})
