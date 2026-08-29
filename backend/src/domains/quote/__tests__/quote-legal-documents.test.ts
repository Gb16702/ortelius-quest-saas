import { describe, expect, it } from 'bun:test'
import {
  quoteLegalDocumentItemSchema,
  quoteLegalDocumentsSchema,
} from '../infrastructure/quote-legal-document-response'
import { createQuoteSchema } from '../presentation/quote.schemas'

const validBaseInput = {
  requestId: 'req-1',
  selectedCategories: ['general'],
  selectedServices: [{ serviceId: 'svc-1', included: true, price: 100 }],
  cargoDetails: {
    weight: null,
    volume: null,
    palletCount: null,
    fragility: null,
    dimensions: { length: null, width: null, height: null },
    options: { hazardous: false, insuranceCoverage: false, perishableGoods: false },
  },
  vatRate: 20,
  totalHT: 100,
  totalTTC: 120,
  vatAmount: 20,
}

describe('createQuoteSchema legalDocumentIds', () => {
  it('rejects when legalDocumentIds is missing', () => {
    const result = createQuoteSchema.safeParse(validBaseInput)
    expect(result.success).toBe(false)
  })

  it('rejects an empty legalDocumentIds array', () => {
    const result = createQuoteSchema.safeParse({ ...validBaseInput, legalDocumentIds: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages.some((m) => m.includes('At least one legal document'))).toBe(true)
    }
  })

  it('rejects non-uuid legalDocumentIds entries', () => {
    const result = createQuoteSchema.safeParse({
      ...validBaseInput,
      legalDocumentIds: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a single valid uuid', () => {
    const result = createQuoteSchema.safeParse({
      ...validBaseInput,
      legalDocumentIds: ['11111111-1111-4111-8111-111111111111'],
    })
    expect(result.success).toBe(true)
  })
})

describe('quoteLegalDocumentItemSchema response shape', () => {
  it('parses a well-formed item', () => {
    const item = {
      id: '11111111-1111-4111-8111-111111111111',
      label: 'Terms & Conditions v3',
      originalFilename: 'tc_v3.pdf',
      sizeBytes: 12345,
      downloadUrl: 'https://s3.example.com/path?sig=abc',
      downloadUrlExpiresAt: new Date().toISOString(),
    }
    const parsed = quoteLegalDocumentItemSchema.parse(item)
    expect(parsed.id).toBe(item.id)
    expect(parsed.label).toBe(item.label)
  })

  it('rejects negative sizeBytes', () => {
    const item = {
      id: '11111111-1111-4111-8111-111111111111',
      label: 'doc',
      originalFilename: 'doc.pdf',
      sizeBytes: -1,
      downloadUrl: 'https://s3.example.com/x',
      downloadUrlExpiresAt: new Date().toISOString(),
    }
    expect(() => quoteLegalDocumentItemSchema.parse(item)).toThrow()
  })

  it('parses an empty list and a list with multiple items', () => {
    expect(quoteLegalDocumentsSchema.parse([])).toEqual([])
    const item = {
      id: '11111111-1111-4111-8111-111111111111',
      label: 'doc',
      originalFilename: 'doc.pdf',
      sizeBytes: 100,
      downloadUrl: 'https://s3.example.com/x',
      downloadUrlExpiresAt: new Date().toISOString(),
    }
    const parsed = quoteLegalDocumentsSchema.parse([
      item,
      { ...item, id: '22222222-2222-4222-8222-222222222222' },
    ])
    expect(parsed).toHaveLength(2)
  })
})
