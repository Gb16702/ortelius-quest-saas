import { afterEach, describe, expect, it } from "bun:test"
import {
    fetchPriceSuggestions,
    pricingSuggestionsKeys,
    type SuggestPricingContext,
} from "../pricing-suggestions.query"

const originalFetch = globalThis.fetch

const pricingContext = {
    serviceIds: ["service-1"],
    cargoCategories: ["category-1"],
    cargoWeight: 100,
    cargoVolume: null,
    cargoIsHazardous: false,
    cargoIsReefer: false,
    cargoIsOversized: false,
} satisfies SuggestPricingContext

afterEach(() => {
    globalThis.fetch = originalFetch
})

describe("pricingSuggestionsKeys", () => {
    it("keys suggestions by request id and pricing context", () => {
        expect(pricingSuggestionsKeys.suggest("request-a", pricingContext)).not.toEqual(
            pricingSuggestionsKeys.suggest("request-b", pricingContext)
        )

        expect(pricingSuggestionsKeys.suggest("request-a", pricingContext)).not.toEqual(
            pricingSuggestionsKeys.suggest("request-a", {
                ...pricingContext,
                cargoWeight: 250,
            })
        )
    })
})

describe("fetchPriceSuggestions", () => {
    it("passes an abort signal to the pricing suggestions request", async () => {
        const controller = new AbortController()
        const fetchState: { receivedSignal: AbortSignal | null } = { receivedSignal: null }

        const mockedFetch = Object.assign(
            (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                fetchState.receivedSignal = init?.signal ?? null
                return Promise.resolve(Response.json({ success: true, data: [] }))
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        globalThis.fetch = mockedFetch

        await fetchPriceSuggestions(pricingContext, { signal: controller.signal })

        expect(fetchState.receivedSignal).toBe(controller.signal)
    })
})
