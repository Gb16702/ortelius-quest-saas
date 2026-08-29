export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
  unit?: string
}

export interface InvoicePricing {
  lines: InvoiceLine[]
  subtotal: number
  vatPercentage: number
  vatAmount: number
  totalAmount: number
  currency: string
  discountPercentage?: number
  discountAmount?: number
}

export interface QuotePricingForInvoice {
  vatRate: number
  totalHT: number
  totalTTC: number
  vatAmount: number
  services?: Array<{
    id: string
    name: string
    price: number
    category?: string
    unit?: string
    quantity?: number
  }>
  currency: string
  discountPercentage?: number
  discountAmount?: number
}

export function createInvoicePricingFromQuotePricing(
  quotePricing: QuotePricingForInvoice
): InvoicePricing {
  return {
    lines:
      quotePricing.services?.map((service) => {
        const quantity = service.quantity || 1
        return {
          id: service.id,
          description: service.name,
          quantity,
          unitPrice: service.price,
          totalPrice: service.price * quantity,
          category: service.category,
          unit: service.unit,
        }
      }) || [],
    subtotal: quotePricing.totalHT,
    vatPercentage: quotePricing.vatRate,
    vatAmount: quotePricing.vatAmount,
    totalAmount: quotePricing.totalTTC,
    currency: quotePricing.currency,
    discountPercentage: quotePricing.discountPercentage,
    discountAmount: quotePricing.discountAmount,
  }
}
