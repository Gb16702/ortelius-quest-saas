import { useState } from "react"
import type { QuoteData } from "../request"

export function useQuoteState() {
    const [quoteData, setQuoteData] = useState<QuoteData>({
        selectedCategories: [],
        selectedServices: [],
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
        vatRate: 0,
        totalHT: 0,
        totalTTC: 0,
        vatAmount: 0,
        legalDocumentIds: [],
    })

    return {
        quoteData,
        setQuoteData,
    }
}
