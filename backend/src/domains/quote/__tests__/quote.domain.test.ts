import { describe, expect, it } from 'bun:test'
import {
  calculateQuoteTotals,
  canEditQuote,
  canRespondToQuote,
  canSendQuote,
  isSupportedQuoteCurrency,
  UnsupportedQuoteCurrencyError,
} from '../domain'

describe('Quote domain', () => {
  describe('pricing', () => {
    it('calculates service totals, VAT, and discounts without infrastructure', () => {
      const totals = calculateQuoteTotals({
        vatRate: 20,
        currency: 'EUR',
        discountPercentage: 10,
        services: [
          { id: 'svc-1', name: 'Transport', price: 100, quantity: 2 },
          { id: 'svc-2', name: 'Handling', price: 50 },
        ],
      })

      expect(totals.totalHT).toBe(225)
      expect(totals.vatAmount).toBe(45)
      expect(totals.totalTTC).toBe(270)
      expect(totals.discountAmount).toBe(25)
      expect(totals.currency).toBe('EUR')
    })

    it('rejects unsupported currencies with a typed domain error', () => {
      expect(() => calculateQuoteTotals({ currency: 'JPY' })).toThrow(UnsupportedQuoteCurrencyError)
      expect(isSupportedQuoteCurrency('GBP')).toBe(true)
      expect(isSupportedQuoteCurrency('JPY')).toBe(false)
    })
  })

  describe('status rules', () => {
    it('allows only draft quotes to be edited or sent', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000)

      expect(canEditQuote('draft')).toBe(true)
      expect(canEditQuote('sent')).toBe(false)
      expect(
        canSendQuote({ status: 'draft', validUntil: future, services: [{ serviceId: 'a' }] })
      ).toBe(true)
      expect(
        canSendQuote({ status: 'sent', validUntil: future, services: [{ serviceId: 'a' }] })
      ).toBe(false)
      expect(canSendQuote({ status: 'draft', validUntil: future, services: [] })).toBe(false)
    })

    it('allows accepting or rejecting only unexpired sent quotes', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000)

      expect(canRespondToQuote({ status: 'sent', validUntil: future })).toBe(true)
      expect(canRespondToQuote({ status: 'draft', validUntil: future })).toBe(false)
      expect(canRespondToQuote({ status: 'sent', validUntil: past })).toBe(false)
    })
  })
})
