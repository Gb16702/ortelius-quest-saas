import { useCallback } from "react"
import { calculateQuoteTotals, type QuoteTotals } from "../../lib/quote-totals"
import type { SelectedService } from "../request"

export function useQuoteCalculations() {
    const calculateTotals = useCallback(
        (services: SelectedService[], vatRate: number): QuoteTotals => {
            return calculateQuoteTotals(services, vatRate)
        },
        []
    )

    return {
        calculateTotals,
    }
}
