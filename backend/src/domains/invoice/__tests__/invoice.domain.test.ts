import { describe, expect, it } from 'bun:test'
import {
  assertCanSendInvoice,
  assertNoInvoiceExists,
  assertQuoteCanBeInvoiced,
  assertRequestCanBeInvoiced,
  createInvoicePricingFromQuotePricing,
  formatInvoiceNumber,
  INVOICE_DOMAIN_ERROR_CODES,
  InvoiceDomainError,
} from '../domain'

function expectInvoiceDomainError(action: () => void, code: string, message: string): void {
  try {
    action()
    throw new Error('Expected action to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(InvoiceDomainError)
    expect((error as InvoiceDomainError).code).toBe(code)
    expect((error as Error).message).toBe(message)
  }
}

describe('Invoice domain', () => {
  it('formats invoice numbers from deterministic time and entropy', () => {
    expect(formatInvoiceNumber(1710000000000, 'abc123')).toBe('INV-LTK9UKG0-ABC123')
  })

  it('maps accepted quote pricing to invoice pricing', () => {
    const pricing = createInvoicePricingFromQuotePricing({
      vatRate: 20,
      totalHT: 150,
      vatAmount: 30,
      totalTTC: 180,
      currency: 'EUR',
      discountPercentage: 10,
      discountAmount: 15,
      services: [
        {
          id: 'svc-1',
          name: 'Freight',
          price: 100,
          quantity: 2,
          category: 'transport',
          unit: 'container',
        },
        {
          id: 'svc-2',
          name: 'Handling',
          price: 50,
        },
      ],
    })

    expect(pricing).toEqual({
      lines: [
        {
          id: 'svc-1',
          description: 'Freight',
          quantity: 2,
          unitPrice: 100,
          totalPrice: 200,
          category: 'transport',
          unit: 'container',
        },
        {
          id: 'svc-2',
          description: 'Handling',
          quantity: 1,
          unitPrice: 50,
          totalPrice: 50,
          category: undefined,
          unit: undefined,
        },
      ],
      subtotal: 150,
      vatPercentage: 20,
      vatAmount: 30,
      totalAmount: 180,
      currency: 'EUR',
      discountPercentage: 10,
      discountAmount: 15,
    })
  })

  it('guards invoice creation preconditions with typed domain errors', () => {
    assertQuoteCanBeInvoiced('sent', true)
    assertRequestCanBeInvoiced('quoted')
    assertNoInvoiceExists(false)

    expectInvoiceDomainError(
      () => assertQuoteCanBeInvoiced('sent'),
      INVOICE_DOMAIN_ERROR_CODES.QUOTE_NOT_ACCEPTED,
      'Can only create invoice after the quote has been accepted by the requester'
    )
    expectInvoiceDomainError(
      () => assertRequestCanBeInvoiced('sent'),
      INVOICE_DOMAIN_ERROR_CODES.REQUEST_NOT_READY,
      'Request must be quoted before an invoice can be created'
    )
    expectInvoiceDomainError(
      () => assertNoInvoiceExists(true),
      INVOICE_DOMAIN_ERROR_CODES.INVOICE_ALREADY_EXISTS,
      'Invoice already exists for this quote'
    )
  })

  it('allows only draft invoices to be sent', () => {
    assertCanSendInvoice('draft')

    expectInvoiceDomainError(
      () => assertCanSendInvoice('sent'),
      INVOICE_DOMAIN_ERROR_CODES.INVALID_STATUS_TRANSITION,
      'Only draft invoices can be sent'
    )
  })
})
