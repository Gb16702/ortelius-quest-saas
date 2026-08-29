import { UnsupportedQuoteCurrencyError } from './quote-errors'

export const SUPPORTED_QUOTE_CURRENCIES = ['EUR', 'USD', 'GBP'] as const

export type SupportedQuoteCurrency = (typeof SUPPORTED_QUOTE_CURRENCIES)[number]

export interface QuotePricingService {
  id: string
  name: string
  price: number
  description?: string
  category?: string
  unit?: string
  quantity?: number
}

export interface QuotePricing {
  vatRate: number
  totalHT: number
  totalTTC: number
  vatAmount: number
  services?: QuotePricingService[]
  currency: SupportedQuoteCurrency
  discountPercentage?: number
  discountAmount?: number
  notes?: string
}

export type QuotePricingInput = Partial<Omit<QuotePricing, 'currency'>> & {
  currency?: string
}

export function isSupportedQuoteCurrency(currency: string): currency is SupportedQuoteCurrency {
  return SUPPORTED_QUOTE_CURRENCIES.includes(currency as SupportedQuoteCurrency)
}

export function calculateQuoteTotals(pricing: QuotePricingInput): QuotePricing {
  const services = pricing.services || []
  const vatRate = pricing.vatRate || 21
  const discountPercentage = pricing.discountPercentage || 0
  const currency = pricing.currency || 'EUR'

  if (!isSupportedQuoteCurrency(currency)) {
    throw new UnsupportedQuoteCurrencyError(currency, SUPPORTED_QUOTE_CURRENCIES)
  }

  const subtotal = services.reduce((sum, service) => {
    const quantity = service.quantity || 1
    return sum + service.price * quantity
  }, 0)

  const discountAmount = (subtotal * discountPercentage) / 100
  const totalHT = subtotal - discountAmount
  const vatAmount = (totalHT * vatRate) / 100
  const totalTTC = totalHT + vatAmount

  return {
    services,
    vatRate,
    totalHT: Number(totalHT.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    currency,
    discountPercentage,
    discountAmount: Number(discountAmount.toFixed(2)),
    notes: pricing.notes,
  }
}
