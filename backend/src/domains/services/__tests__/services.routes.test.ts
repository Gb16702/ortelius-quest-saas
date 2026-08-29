import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { Service, ServiceWithSelectionStatus } from '../application/service-models'

const mockServicesApplicationService = {
  getAll: mock((): Promise<Service[]> => Promise.resolve([])),
  getByOrganization: mock((): Promise<Service[]> => Promise.resolve([])),
  updateOrganizationServices: mock((): Promise<Service[]> => Promise.resolve([])),
  getWithSelectionStatus: mock((): Promise<ServiceWithSelectionStatus[]> => Promise.resolve([])),
}

mock.module('../services.application', () => ({
  servicesApplicationService: mockServicesApplicationService,
}))

const { default: services } = await import('../presentation/services.routes')

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'service-1',
    name: 'Test Service',
    slug: 'test-service',
    type: 'cargo',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/services', services)
  return app
}

describe('Services Routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = createApp()
    Object.values(mockServicesApplicationService).forEach((mockFn) => mockFn.mockReset())
    mockServicesApplicationService.getAll.mockResolvedValue([makeService()])
    mockServicesApplicationService.getByOrganization.mockResolvedValue([
      makeService({ id: 'service-2', name: 'Org Service', slug: 'org-service' }),
    ])
    mockServicesApplicationService.updateOrganizationServices.mockResolvedValue([
      makeService({ id: 'service-3', name: 'Updated Service', slug: 'updated-service' }),
    ])
    mockServicesApplicationService.getWithSelectionStatus.mockResolvedValue([
      { ...makeService({ id: 'service-4' }), isSelected: true },
    ])
  })

  it('returns all services when no organization is present in context', async () => {
    const response = await app.request('/services')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject([{ id: 'service-1', name: 'Test Service' }])
    expect(mockServicesApplicationService.getAll).toHaveBeenCalledTimes(1)
  })

  it('returns services selected by the current organization context', async () => {
    const appWithContext = new Hono<{ Variables: CommonVariables }>()
    appWithContext.use('*', async (c, next) => {
      c.set('organizationId', 'org-123')
      await next()
    })
    appWithContext.route('/services', services)

    const response = await appWithContext.request('/services')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockServicesApplicationService.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('loads organization services from the application facade', async () => {
    const response = await app.request('/services/organizations/org-123')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject([{ id: 'service-2', name: 'Org Service' }])
    expect(mockServicesApplicationService.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('updates organization services through the application facade', async () => {
    const operations = { add: ['service-1'], remove: ['service-2'] }

    const response = await app.request('/services/organizations/org-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operations),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Organization services updated successfully')
    expect(mockServicesApplicationService.updateOrganizationServices).toHaveBeenCalledWith(
      'org-123',
      operations
    )
  })

  it('rejects patch payloads without add or remove operations', async () => {
    const response = await app.request('/services/organizations/org-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(400)
  })

  it('loads services with selection status', async () => {
    const response = await app.request('/services/organizations/org-123/with-selection')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject([{ id: 'service-4', isSelected: true }])
    expect(mockServicesApplicationService.getWithSelectionStatus).toHaveBeenCalledWith('org-123')
  })

  it('returns service errors without changing the response contract', async () => {
    mockServicesApplicationService.getAll.mockRejectedValue(new Error('Database error'))

    const response = await app.request('/services')
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.code).toBe('INTERNAL_SERVER_ERROR')
    expect(json.message).toBe('Failed to fetch services')
  })
})
