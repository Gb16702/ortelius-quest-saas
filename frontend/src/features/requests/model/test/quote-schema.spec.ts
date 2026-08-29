import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { quotesResponseSchema } from "../schemas/request.schema"

const quotePayload = {
    id: "qa-quote-atlas-sent",
    quoteNumber: "QT-QA-ATLAS-001",
    requestId: "qa-req-atlas-invoiced",
    organizationId: "qa-org-atlas",
    createdById: "qa-user-atlas-member",
    cargoTypes: ["qa-cat-air"],
    services: [{ serviceId: "qa-svc-air-priority", included: true, price: 1200 }],
    cargoDetails: {
        weight: 300,
        volume: 12,
        palletCount: 2,
        fragility: "robust",
        dimensions: {
            length: 120,
            width: 80,
            height: 90,
        },
        options: {
            hazardous: false,
            insuranceCoverage: true,
            perishableGoods: false,
        },
    },
    comments: {
        comment: "Ready for requester response.",
    },
    pricing: {
        vatRate: 21,
        totalHT: 1200,
        totalTTC: 1452,
        vatAmount: 252,
        currency: "EUR",
    },
    description: null,
    terms: null,
    validUntil: "2026-06-14T10:00:00.000Z",
    status: "sent",
    version: 1,
    respondedAt: "2026-05-15T10:00:00.000Z",
    respondedById: "qa-user-requester-nora",
    rejectionReason: null,
    createdAt: "2026-05-15T09:00:00.000Z",
    updatedAt: "2026-05-15T10:00:00.000Z",
}

describe("quotesResponseSchema", () => {
    it("normalizes quote timing and documents from the API persistence shape", () => {
        const fromDate = Date.UTC(2026, 4, 23, 10)
        const toDate = Date.UTC(2026, 4, 30, 10)

        const result = parseSchema(quotesResponseSchema, {
            data: [
                {
                    ...quotePayload,
                    timing: {
                        fromDate,
                        toDate,
                        comment: "QA sent quote timing",
                    },
                    documents: {
                        documents: [
                            {
                                name: "qa-atlas-terms.pdf",
                                size: 1024,
                                type: "application/pdf",
                            },
                        ],
                        comment: "QA sent quote document notes",
                    },
                },
            ],
        })

        expect(result.data[0]?.timing).toEqual(
            expect.objectContaining({
                fromDate: new Date(fromDate).toISOString(),
                toDate: new Date(toDate).toISOString(),
                comment: "QA sent quote timing",
            })
        )
        expect(result.data[0]?.documents).toEqual([
            {
                name: "qa-atlas-terms.pdf",
                size: 1024,
                type: "application/pdf",
            },
        ])
    })
})
