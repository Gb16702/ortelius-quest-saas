import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { Category, CategoryWithSelectionStatus } from '../application/category-models'

const mockCategoriesApplicationService = {
  getAll: mock((): Promise<Category[]> => Promise.resolve([])),
  getByOrganization: mock((): Promise<Category[]> => Promise.resolve([])),
  updateOrganizationCategories: mock((): Promise<Category[]> => Promise.resolve([])),
  getWithSelectionStatus: mock((): Promise<CategoryWithSelectionStatus[]> => Promise.resolve([])),
}

mock.module('../categories.application', () => ({
  categoriesApplicationService: mockCategoriesApplicationService,
}))

const { default: categories } = await import('../presentation/categories.routes')

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-1',
    name: 'Test Category',
    slug: 'test-category',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/categories', categories)
  return app
}

describe('Categories Routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = createApp()
    Object.values(mockCategoriesApplicationService).forEach((mockFn) => mockFn.mockReset())
    mockCategoriesApplicationService.getAll.mockResolvedValue([makeCategory()])
    mockCategoriesApplicationService.getByOrganization.mockResolvedValue([
      makeCategory({ id: 'category-2', name: 'Org Category', slug: 'org-category' }),
    ])
    mockCategoriesApplicationService.updateOrganizationCategories.mockResolvedValue([
      makeCategory({ id: 'category-3', name: 'Updated Category', slug: 'updated-category' }),
    ])
    mockCategoriesApplicationService.getWithSelectionStatus.mockResolvedValue([
      { ...makeCategory({ id: 'category-4' }), isSelected: true },
    ])
  })

  it('returns all categories when no organization is present in context', async () => {
    const response = await app.request('/categories')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject([{ id: 'category-1', name: 'Test Category' }])
    expect(mockCategoriesApplicationService.getAll).toHaveBeenCalledTimes(1)
  })

  it('returns categories selected by the current organization context', async () => {
    const appWithContext = new Hono<{ Variables: CommonVariables }>()
    appWithContext.use('*', async (c, next) => {
      c.set('organizationId', 'org-123')
      await next()
    })
    appWithContext.route('/categories', categories)

    const response = await appWithContext.request('/categories')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockCategoriesApplicationService.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('loads organization categories from the application facade', async () => {
    const response = await app.request('/categories/organizations/org-123')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject([{ id: 'category-2', name: 'Org Category' }])
    expect(mockCategoriesApplicationService.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('updates organization categories through the application facade', async () => {
    const operations = { add: ['category-1'], remove: ['category-2'] }

    const response = await app.request('/categories/organizations/org-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operations),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Organization categories updated successfully')
    expect(mockCategoriesApplicationService.updateOrganizationCategories).toHaveBeenCalledWith(
      'org-123',
      operations
    )
  })

  it('rejects patch payloads without add or remove operations', async () => {
    const response = await app.request('/categories/organizations/org-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(400)
  })

  it('loads categories with selection status', async () => {
    const response = await app.request('/categories/organizations/org-123/with-selection')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject([{ id: 'category-4', isSelected: true }])
    expect(mockCategoriesApplicationService.getWithSelectionStatus).toHaveBeenCalledWith('org-123')
  })

  it('does not expose service errors for selection status failures', async () => {
    mockCategoriesApplicationService.getWithSelectionStatus.mockRejectedValueOnce(
      new Error('database password=secret')
    )

    const response = await app.request('/categories/organizations/org-123/with-selection')
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch categories with selection status',
    })
  })

  it('returns service errors without changing the response contract', async () => {
    mockCategoriesApplicationService.getAll.mockRejectedValue(new Error('Database error'))

    const response = await app.request('/categories')
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.code).toBe('INTERNAL_SERVER_ERROR')
    expect(json.message).toBe('Failed to fetch categories')
  })
})
