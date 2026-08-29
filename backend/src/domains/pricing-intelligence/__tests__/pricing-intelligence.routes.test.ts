import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { createPricingIntelligenceRoutes } from '../presentation/pricing-intelligence.routes'

const mockPricingIntelligenceApplicationService = {
  captureFromAcceptedQuote: mock(() => Promise.resolve()),
  deleteImportBatch: mock(() => Promise.resolve()),
  generateCsvTemplate: mock(() => Promise.resolve('service_name,price')),
  getImportBatches: mock(() => Promise.resolve([])),
  getStats: mock(() =>
    Promise.resolve({
      totalTransactions: 0,
      totalImports: 0,
      services: [],
    })
  ),
  importCsv: mock(() =>
    Promise.resolve({
      batchId: 'batch-1',
      fileName: 'prices.csv',
      rowCount: 1,
      errorCount: 0,
      errors: [],
    })
  ),
  resolveOrganizationIdForUser: mock(() => Promise.resolve('org-123')),
  suggestPricing: mock(() => Promise.resolve([])),
}

function createApp(user: { id: string } | null = { id: 'user-123' }) {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.use('*', async (c, next) => {
    if (user) c.set('user', user as CommonVariables['user'])
    await next()
  })
  app.route(
    '/pricing-intelligence',
    createPricingIntelligenceRoutes(mockPricingIntelligenceApplicationService)
  )
  return app
}

describe('Pricing intelligence routes', () => {
  beforeEach(() => {
    Object.values(mockPricingIntelligenceApplicationService).forEach((fn) => fn.mockClear())
    mockPricingIntelligenceApplicationService.generateCsvTemplate.mockResolvedValue(
      'service_name,price'
    )
    mockPricingIntelligenceApplicationService.getImportBatches.mockResolvedValue([])
    mockPricingIntelligenceApplicationService.getStats.mockResolvedValue({
      totalTransactions: 0,
      totalImports: 0,
      services: [],
    })
    mockPricingIntelligenceApplicationService.importCsv.mockResolvedValue({
      batchId: 'batch-1',
      fileName: 'prices.csv',
      rowCount: 1,
      errorCount: 0,
      errors: [],
    })
    mockPricingIntelligenceApplicationService.resolveOrganizationIdForUser.mockResolvedValue(
      'org-123'
    )
    mockPricingIntelligenceApplicationService.suggestPricing.mockResolvedValue([])
  })

  it('returns the template CSV with the existing download contract', async () => {
    const response = await createApp().request('/pricing-intelligence/template')
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="pricing-template.csv"'
    )
    expect(body).toBe('service_name,price')
    expect(mockPricingIntelligenceApplicationService.generateCsvTemplate).toHaveBeenCalledWith(
      'org-123'
    )
  })

  it('imports uploaded CSV files through the application facade', async () => {
    const formData = new FormData()
    formData.set('file', new File(['service_name,price\nTowage,817'], 'prices.csv'))

    const response = await createApp().request('/pricing-intelligence/import', {
      method: 'POST',
      body: formData,
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toMatchObject({ success: true, data: { batchId: 'batch-1' } })
    expect(mockPricingIntelligenceApplicationService.importCsv).toHaveBeenCalledWith(
      'org-123',
      'service_name,price\nTowage,817',
      'prices.csv',
      'user-123'
    )
  })

  it('rejects requests without authenticated organization context', async () => {
    const response = await createApp(null).request('/pricing-intelligence/stats')
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json).toEqual({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  })

  it('validates suggest payload and preserves success response shape', async () => {
    const response = await createApp().request('/pricing-intelligence/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceIds: ['svc-1'],
        cargoCategories: [],
        cargoWeight: null,
        cargoVolume: null,
        cargoIsHazardous: false,
        cargoIsReefer: false,
        cargoIsOversized: false,
      }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, data: [] })
    expect(mockPricingIntelligenceApplicationService.suggestPricing).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({ serviceIds: ['svc-1'] })
    )
  })

  it('returns service errors without changing the error response contract', async () => {
    mockPricingIntelligenceApplicationService.getStats.mockRejectedValue(
      new Error('Database error')
    )

    const response = await createApp().request('/pricing-intelligence/stats')
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch stats',
    })
  })
})
