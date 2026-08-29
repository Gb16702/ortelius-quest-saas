import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { Invoice } from '../application/invoice-models'

const testUser = {
  id: 'user-123',
  email: 'test@example.com',
}

const mockInvoiceApplicationService = {
  createInvoiceFromQuote: mock((): Promise<Invoice> => Promise.resolve(makeInvoice())),
  getInvoiceById: mock((): Promise<Invoice | null> => Promise.resolve(makeInvoice())),
  getInvoicesByOrganization: mock((): Promise<Invoice[]> => Promise.resolve([makeInvoice()])),
  getInvoicesByRequest: mock((): Promise<Invoice[]> => Promise.resolve([makeInvoice()])),
  sendInvoice: mock((): Promise<Invoice> => Promise.resolve(makeInvoice({ status: 'sent' }))),
}

const mockRequireAuthMiddleware = mock(
  async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
    c.set('user', testUser)
    await next()
  }
)

const mockRequireInvoiceOwnership = mock(
  async (_c: Context<{ Variables: CommonVariables }>, next: Next) => {
    await next()
  }
)

mock.module('../invoice.application', () => ({
  invoiceApplicationService: mockInvoiceApplicationService,
}))

mock.module('../../../infrastructure/auth/auth.middleware', () => ({
  requireAuthMiddleware: mockRequireAuthMiddleware,
}))

mock.module('../presentation/invoice.middleware', () => ({
  requireInvoiceOwnership: mockRequireInvoiceOwnership,
}))

const { default: invoiceRoutes } = await import('../presentation/invoice.routes')

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-123',
    invoiceNumber: 'INV-TEST-123456',
    requestId: 'request-123',
    quoteId: 'quote-123',
    organizationId: 'org-123',
    createdById: 'user-123',
    pricing: {
      lines: [],
      subtotal: 1000,
      vatPercentage: 20,
      vatAmount: 200,
      totalAmount: 1200,
      currency: 'EUR',
    },
    description: 'Test invoice',
    terms: 'Net 30',
    notes: null,
    issueDate: new Date('2026-05-01T00:00:00.000Z'),
    dueDate: new Date('2026-06-01T00:00:00.000Z'),
    status: 'draft',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeCreateInvoicePayload() {
  return {
    quoteId: 'quote-123',
    dueDate: '2026-06-01',
    description: 'Test invoice',
    terms: 'Net 30',
    notes: 'Test notes',
  }
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/invoices', invoiceRoutes)
  return app
}

describe('Invoice Routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = createApp()

    Object.values(mockInvoiceApplicationService).forEach((mockFn) => mockFn.mockReset())
    mockInvoiceApplicationService.createInvoiceFromQuote.mockResolvedValue(makeInvoice())
    mockInvoiceApplicationService.getInvoiceById.mockResolvedValue(makeInvoice())
    mockInvoiceApplicationService.getInvoicesByOrganization.mockResolvedValue([makeInvoice()])
    mockInvoiceApplicationService.getInvoicesByRequest.mockResolvedValue([makeInvoice()])
    mockInvoiceApplicationService.sendInvoice.mockResolvedValue(makeInvoice({ status: 'sent' }))

    mockRequireAuthMiddleware.mockClear()
    mockRequireInvoiceOwnership.mockClear()
  })

  it('creates an invoice through the application service', async () => {
    const response = await app.request('/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeCreateInvoicePayload()),
    })
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Invoice created successfully')
    expect(json.data).toMatchObject({
      id: 'invoice-123',
      invoiceNumber: 'INV-TEST-123456',
      quoteId: 'quote-123',
    })
    expect(mockInvoiceApplicationService.createInvoiceFromQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: 'quote-123',
        actorId: 'user-123',
        dueDate: expect.any(Date),
        description: 'Test invoice',
        terms: 'Net 30',
        notes: 'Test notes',
      })
    )
  })

  it('returns 404 when invoice creation references a missing quote', async () => {
    mockInvoiceApplicationService.createInvoiceFromQuote.mockRejectedValue(
      new Error('Quote not found')
    )

    const response = await app.request('/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeCreateInvoicePayload()),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.code).toBe('NOT_FOUND')
    expect(json.message).toBe('Quote not found')
  })

  it('does not expose unexpected invoice creation failures', async () => {
    mockInvoiceApplicationService.createInvoiceFromQuote.mockRejectedValue(
      new Error('database password=secret')
    )

    const response = await app.request('/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeCreateInvoicePayload()),
    })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create invoice',
    })
  })

  it('loads an invoice by id through the application service', async () => {
    const response = await app.request('/invoices/invoice-123')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject({
      id: 'invoice-123',
      invoiceNumber: 'INV-TEST-123456',
    })
    expect(mockInvoiceApplicationService.getInvoiceById).toHaveBeenCalledWith('invoice-123')
    expect(mockRequireInvoiceOwnership).toHaveBeenCalled()
  })

  it('returns 404 when an invoice is not found', async () => {
    mockInvoiceApplicationService.getInvoiceById.mockResolvedValue(null)

    const response = await app.request('/invoices/non-existent')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.code).toBe('NOT_FOUND')
    expect(json.message).toBe('Invoice not found')
  })

  it('sends an invoice through the application service', async () => {
    const response = await app.request('/invoices/invoice-123/send', { method: 'PATCH' })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Invoice sent successfully')
    expect(json.data.status).toBe('sent')
    expect(mockInvoiceApplicationService.sendInvoice).toHaveBeenCalledWith(
      'invoice-123',
      'user-123'
    )
  })

  it('lists invoices by organization and by request', async () => {
    const organizationResponse = await app.request('/invoices/organization/org-123')
    const organizationJson = await organizationResponse.json()
    const requestResponse = await app.request('/invoices/request/request-123')
    const requestJson = await requestResponse.json()

    expect(organizationResponse.status).toBe(200)
    expect(organizationJson.success).toBe(true)
    expect(organizationJson.data).toHaveLength(1)
    expect(mockInvoiceApplicationService.getInvoicesByOrganization).toHaveBeenCalledWith(
      'org-123',
      'user-123'
    )

    expect(requestResponse.status).toBe(200)
    expect(requestJson.success).toBe(true)
    expect(requestJson.data).toHaveLength(1)
    expect(mockInvoiceApplicationService.getInvoicesByRequest).toHaveBeenCalledWith(
      'request-123',
      'user-123'
    )
  })

  it('returns 403 and no invoice data when organization invoice access is denied', async () => {
    mockInvoiceApplicationService.getInvoicesByOrganization.mockRejectedValue(
      new Error('You are not a member of this organization')
    )

    const response = await app.request('/invoices/organization/other-org')
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization',
    })
    expect(mockInvoiceApplicationService.getInvoicesByOrganization).toHaveBeenCalledWith(
      'other-org',
      'user-123'
    )
  })

  it('returns 404 and no invoice data when the parent request is not accessible', async () => {
    mockInvoiceApplicationService.getInvoicesByRequest.mockRejectedValue(
      new Error('Associated request not found')
    )

    const response = await app.request('/invoices/request/other-request')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Associated request not found',
    })
  })
})
