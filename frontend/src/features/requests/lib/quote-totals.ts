import type { QuoteData, SelectedService } from "../model/request"

export type QuoteTotals = Pick<QuoteData, "totalHT" | "vatAmount" | "totalTTC">

export function calculateQuoteTotals(services: SelectedService[], vatRate: number): QuoteTotals {
    const servicesTotal = services
        .filter((service) => service.included)
        .reduce((sum, service) => sum + service.price, 0)

    const totalHT = servicesTotal
    const vatAmount = (totalHT * vatRate) / 100
    const totalTTC = totalHT + vatAmount

    return {
        totalHT,
        vatAmount,
        totalTTC,
    }
}
