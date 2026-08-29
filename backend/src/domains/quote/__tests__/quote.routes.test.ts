import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { QuoteRecord } from '../application/ports'
import { QuoteCreateForbiddenError } from '../application/quote-errors'

const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

const mockQuoteApplicationService = {
  createAndSendQuote: mock((): Promise<QuoteRecord> => Promise.resolve(makeQuote())),
  getQuoteById: mock((): Promise<QuoteRecord> => Promise.resolve(makeQuote())),
  updateQuote: mock((): Promise<QuoteRecord> => Promise.resolve(makeQuote())),
  acceptQuote: mock((): Promise<QuoteRecord> => Promise.resolve(makeQuote({ status: 'sent' }))),
  rejectQuote: mock((): Promise<QuoteRecord> => Promise.resolve(makeQuote({ status: 'rejected' }))),
  getQuotesByRequest: mock((): Promise<QuoteRecord[]> => Promise.resolve([makeQuote()])),
  getOrganizationQuotes: mock((): Promise<QuoteRecord[]> => Promise.resolve([makeQuote()])),
}

const mockRequireAuthMiddleware = mock(
  async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
    c.set('user', testUser)
    await next()
  }
)

const mockRequireQuoteOwnership = mock(
  async (_c: Context<{ Variables: CommonVariables }>, next: Next) => {
    await next()
  }
)

mock.module('../quote.application', () => ({
  quoteApplicationService: mockQuoteApplicationService,
}))

mock.module('../../../infrastructure/auth/auth.middleware', () => ({
  requireAuthMiddleware: mockRequireAuthMiddleware,
}))

mock.module('../presentation/quote.middleware', () => ({
  requireQuoteOwnership: mockRequireQuoteOwnership,
}))

const { default: quoteRoutes } = await import('../presentation/quote.routes')

function makeQuote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: 'quote-123',
    quoteNumber: 'QT-123',
    requestId: 'request-123',
    organizationId: 'org-123',
    createdById: 'user-123',
    status: 'sent',
    ...overrides,
  }
}

function makeCreateQuotePayload() {
  return {
    requestId: 'request-123',
    selectedCategories: ['general'],
    selectedServices: [{ serviceId: 'service-1', included: true, price: 1000 }],
    cargoDetails: {
      weight: null,
      volume: null,
      palletCount: null,
      fragility: null,
      dimensions: { length: null, width: null, height: null },
      options: { hazardous: false, insuranceCoverage: false, perishableGoods: false },
    },
    vatRate: 20,
    totalHT: 1000,
    totalTTC: 1200,
    vatAmount: 200,
    legalDocumentIds: ['11111111-1111-4111-8111-111111111111'],
  }
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/quotes', quoteRoutes)
  return app
}

describe('Quote Routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = createApp()

    Object.values(mockQuoteApplicationService).forEach((mockFn) => mockFn.mockReset())
    mockQuoteApplicationService.createAndSendQuote.mockResolvedValue(makeQuote())
    mockQuoteApplicationService.getQuoteById.mockResolvedValue(makeQuote())
    mockQuoteApplicationService.updateQuote.mockResolvedValue(makeQuote())
    mockQuoteApplicationService.acceptQuote.mockResolvedValue(makeQuote({ status: 'sent' }))
    mockQuoteApplicationService.rejectQuote.mockResolvedValue(makeQuote({ status: 'rejected' }))
    mockQuoteApplicationService.getQuotesByRequest.mockResolvedValue([makeQuote()])
    mockQuoteApplicationService.getOrganizationQuotes.mockResolvedValue([makeQuote()])

    mockRequireAuthMiddleware.mockClear()
    mockRequireQuoteOwnership.mockClear()
  })

  it('creates and sends a quote through the application service', async () => {
    const response = await app.request('/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeCreateQuotePayload()),
    })
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Quote created and sent successfully')
    expect(mockQuoteApplicationService.createAndSendQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-123',
        totalTTC: 1200,
      }),
      'user-123'
    )
  })

  it('returns 403 when quote creation is forbidden by the use case', async () => {
    mockQuoteApplicationService.createAndSendQuote.mockRejectedValue(
      new QuoteCreateForbiddenError()
    )

    const response = await app.request('/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeCreateQuotePayload()),
    })
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message:
        'You do not have permission to create quotes for this request. Only admins, owners, or the assigned member can create quotes.',
    })
  })

  it('does not expose unexpected quote creation failures', async () => {
    mockQuoteApplicationService.createAndSendQuote.mockRejectedValue(
      new Error('database password=secret')
    )

    const response = await app.request('/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeCreateQuotePayload()),
    })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create quote',
    })
  })

  it('maps missing quotes to a matching not found contract', async () => {
    mockQuoteApplicationService.getQuoteById.mockRejectedValue(new Error('Quote not found'))

    const response = await app.request('/quotes/missing')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Quote not found',
    })
  })

  it('loads a quote by id through the application service', async () => {
    const response = await app.request('/quotes/quote-123')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('quote-123')
    expect(mockQuoteApplicationService.getQuoteById).toHaveBeenCalledWith('quote-123')
    expect(mockRequireQuoteOwnership).toHaveBeenCalledTimes(1)
  })

  it('loads quotes by request only after the parent request is accessible', async () => {
    const response = await app.request('/quotes/request/request-123')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(mockQuoteApplicationService.getQuotesByRequest).toHaveBeenCalledWith(
      'request-123',
      'user-123'
    )
  })

  it('returns 404 and no quote data when the parent request is not accessible', async () => {
    mockQuoteApplicationService.getQuotesByRequest.mockRejectedValue(
      new Error('Associated request not found')
    )

    const response = await app.request('/quotes/request/other-request')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Associated request not found',
    })
  })

  it('rejects a quote through the application service', async () => {
    const response = await app.request('/quotes/quote-123/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason: 'Too expensive' }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Quote rejected successfully')
    expect(mockQuoteApplicationService.rejectQuote).toHaveBeenCalledWith(
      'quote-123',
      'Too expensive',
      'user-123'
    )
  })
})
