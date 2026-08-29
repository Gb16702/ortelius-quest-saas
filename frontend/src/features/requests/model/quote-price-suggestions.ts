import type { QuoteData, SelectedService } from "./request"

interface QuotePriceSuggestion {
    serviceId: string
    suggestedPrice: number
}

export interface QuotePriceSuggestionsResult<
    Suggestion extends QuotePriceSuggestion = QuotePriceSuggestion,
> {
    requestId: string
    suggestions: Suggestion[]
}

interface QuoteTotals {
    totalHT: number
    vatAmount: number
    totalTTC: number
}

interface ApplyQuotePriceSuggestionsParams<
    Suggestion extends QuotePriceSuggestion = QuotePriceSuggestion,
> {
    activeRequestId: string
    result: QuotePriceSuggestionsResult<Suggestion> | null | undefined
    quoteData: QuoteData
    calculateTotals: (services: SelectedService[], vatRate: number) => QuoteTotals
}

export function getActiveQuotePriceSuggestions<
    Suggestion extends QuotePriceSuggestion = QuotePriceSuggestion,
>(
    activeRequestId: string | null | undefined,
    result: QuotePriceSuggestionsResult<Suggestion> | null | undefined
): Suggestion[] {
    if (!activeRequestId || result?.requestId !== activeRequestId) return []
    return result.suggestions
}

export function applyQuotePriceSuggestionsToDraft<
    Suggestion extends QuotePriceSuggestion = QuotePriceSuggestion,
>({
    activeRequestId,
    result,
    quoteData,
    calculateTotals,
}: ApplyQuotePriceSuggestionsParams<Suggestion>): QuoteData {
    const suggestions = getActiveQuotePriceSuggestions(activeRequestId, result)
    if (suggestions.length === 0) return quoteData

    const priceMap = new Map(suggestions.map((suggestion) => [suggestion.serviceId, suggestion]))
    let didApplySuggestion = false

    const updatedServices = quoteData.selectedServices.map((service) => {
        const suggestion = priceMap.get(service.serviceId)
        if (!suggestion) return service

        didApplySuggestion = true
        return {
            ...service,
            price: suggestion.suggestedPrice,
        }
    })

    if (!didApplySuggestion) return quoteData

    const totals = calculateTotals(updatedServices, quoteData.vatRate)
    return {
        ...quoteData,
        selectedServices: updatedServices,
        ...totals,
    }
}
