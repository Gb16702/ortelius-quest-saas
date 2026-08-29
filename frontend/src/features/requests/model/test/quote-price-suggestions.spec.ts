import { describe, expect, it } from "bun:test"
import { calculateQuoteTotals } from "../../lib/quote-totals"
import {
    applyQuotePriceSuggestionsToDraft,
    type QuotePriceSuggestionsResult,
} from "../quote-price-suggestions"
import type { QuoteData } from "../request"

function createDeferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve
        reject = promiseReject
    })

    return { promise, resolve, reject }
}

function createQuoteData(serviceId: string, price: number): QuoteData {
    const selectedServices = [{ serviceId, included: true, price }]
    const totals = calculateQuoteTotals(selectedServices, 21)

    return {
        selectedCategories: ["category-1"],
        selectedServices,
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
        description: "",
        vatRate: 21,
        ...totals,
        legalDocumentIds: [],
    }
}

describe("applyQuotePriceSuggestionsToDraft", () => {
    it("ignores a resolved request A suggestion after the active draft switches to request B", async () => {
        let activeRequestId = "request-a"
        let draft = createQuoteData("service-b", 0)
        const requestASuggestions = createDeferred<QuotePriceSuggestionsResult>()

        const applyResolvedSuggestions = async () => {
            const result = await requestASuggestions.promise
            draft = applyQuotePriceSuggestionsToDraft({
                activeRequestId,
                result,
                quoteData: draft,
                calculateTotals: calculateQuoteTotals,
            })
        }

        const pendingApplication = applyResolvedSuggestions()
        activeRequestId = "request-b"
        draft = createQuoteData("service-b", 0)

        requestASuggestions.resolve({
            requestId: "request-a",
            suggestions: [{ serviceId: "service-b", suggestedPrice: 999 }],
        })
        await pendingApplication

        expect(draft.selectedServices).toEqual([
            {
                serviceId: "service-b",
                included: true,
                price: 0,
            },
        ])
        expect(draft.totalHT).toBe(0)
    })

    it("applies suggestions when the resolved request still matches the active draft", () => {
        const draft = createQuoteData("service-a", 0)

        const updatedDraft = applyQuotePriceSuggestionsToDraft({
            activeRequestId: "request-a",
            result: {
                requestId: "request-a",
                suggestions: [{ serviceId: "service-a", suggestedPrice: 125 }],
            },
            quoteData: draft,
            calculateTotals: calculateQuoteTotals,
        })

        expect(updatedDraft.selectedServices[0]?.price).toBe(125)
        expect(updatedDraft.totalHT).toBe(125)
        expect(updatedDraft.vatAmount).toBe(26.25)
        expect(updatedDraft.totalTTC).toBe(151.25)
    })
})
