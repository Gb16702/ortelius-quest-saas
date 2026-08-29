import type * as v from "valibot"
import { TEST_ORG_ID, TEST_USER_ID } from "@/shared/test/fixtures/identity"
import type { quoteSchema } from "../schemas/request.schema"

type Quote = v.InferOutput<typeof quoteSchema>

export function createQuote(overrides: Partial<Quote> = {}): Quote {
    return {
        id: "quote-1",
        quoteNumber: "Q-0001",
        requestId: "request-1",
        organizationId: TEST_ORG_ID,
        createdById: TEST_USER_ID,
        cargoTypes: ["pallet"],
        services: [{ serviceId: "service-1", included: true, price: 100 }],
        cargoDetails: {
            weight: 250,
            volume: 1.2,
            palletCount: 2,
            fragility: "robust",
            dimensions: { length: 120, width: 80, height: 100 },
            options: { hazardous: false, insuranceCoverage: false, perishableGoods: false },
        },
        timing: { fromDate: "2026-06-01T00:00:00.000Z", toDate: "2026-06-05T00:00:00.000Z" },
        documents: [],
        comments: null,
        pricing: {
            vatRate: 20,
            totalHT: 100,
            totalTTC: 120,
            vatAmount: 20,
            currency: "EUR",
        },
        description: null,
        terms: null,
        validUntil: "2026-06-30T00:00:00.000Z",
        status: "sent",
        version: 1,
        respondedAt: null,
        respondedById: null,
        rejectionReason: null,
        createdAt: "2026-05-15T00:00:00.000Z",
        updatedAt: "2026-05-15T00:00:00.000Z",
        legalDocuments: [],
        ...overrides,
    }
}
