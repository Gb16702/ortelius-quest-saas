import type { QuoteData } from "../model/request"

export function hasIncludedQuoteServices(quoteData: Pick<QuoteData, "selectedServices">): boolean {
    return quoteData.selectedServices.some((service) => service.included)
}

export function getQuoteSubmissionError(quoteData: QuoteData): string | null {
    if (quoteData.selectedCategories.length === 0) {
        return "Please select at least one cargo type to submit a quote"
    }

    if (!hasIncludedQuoteServices(quoteData)) {
        return "Please select at least one service to submit a quote"
    }

    if (quoteData.totalHT <= 0) {
        return "Total amount must be greater than 0"
    }

    if (quoteData.legalDocumentIds.length === 0) {
        return "Please attach at least one legal document to submit a quote"
    }

    return null
}
