import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { DEFAULT_ORGANIZATION_FONT } from '../domain'

const mockOrganizationApplicationService = {
  getShowcaseData: mock(async () => ({
    organization: {
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
      logo: null,
      tagline: null,
      overview: null,
      website: null,
      brandColor: '#0103B8',
      font: DEFAULT_ORGANIZATION_FONT,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      memberCount: 2,
    },
    stats: { profileViews: 0, requestsHandled: 0, responseRate: 0 },
    services: [],
    cargoTypes: [],
  })),
  getBySlug: mock(async () => ({
    id: 'org-1',
    name: 'Ortelius',
    slug: 'ortelius',
    font: DEFAULT_ORGANIZATION_FONT,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
  })),
  getInfo: mock(async () => ({
    id: 'org-1',
    name: 'Ortelius',
    slug: 'ortelius',
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    taxIdType: 'vat',
    taxIdNumber: 'BE123',
    emailIntakeEnabled: true,
    font: DEFAULT_ORGANIZATION_FONT,
  })),
  getSetupStatus: mock(async () => ({
    hasLogo: true,
    hasTagline: true,
    hasOverview: false,
    hasServices: true,
    hasCargoTypes: true,
    hasVatConfig: true,
    hasLegalDocuments: false,
    memberCount: 2,
    isComplete: true,
  })),
  getDashboard: mock(async () => ({
    members: [],
    totalMembers: 0,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
  })),
  listMembers: mock(async () => ({
    members: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    userRole: 'admin',
  })),
  getUserRole: mock(async () => 'admin'),
  updateSettings: mock(async () => undefined),
  notifyRealtimeUpdate: mock(async () => undefined),
  updateTaxId: mock(async () => undefined),
  updateEmailIntake: mock(async () => ({
    success: true,
    emailAddress: 'ortelius@inbound.ortelius.app',
  })),
  updateMemberRole: mock(async () => ({ id: 'member-1', role: 'admin' })),
  leaveOrganization: mock(async () => undefined),
  removeMember: mock(async () => undefined),
  updateLogo: mock(async () => ({ logoUrl: 'https://cdn.example.com/logo.png' })),
  removeLogo: mock(async () => undefined),
}

const mockCategoriesApplicationService = {
  getByOrganization: mock(async () => []),
  getWithSelectionStatus: mock(async () => []),
  updateOrganizationCategories: mock(async () => []),
}

mock.module('../organization.application', () => ({
  organizationApplicationService: mockOrganizationApplicationService,
}))

mock.module('../../categories/categories.application', () => ({
  categoriesApplicationService: mockCategoriesApplicationService,
}))

mock.module('../../../infrastructure/config/environment', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: 'localhost',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_NAME: 'test',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_MAX_CONNECTIONS: 10,
    DB_TIMEOUT: 30000,
    COGNITO_USERPOOL_ID: 'test-pool',
    COGNITO_CLIENT_ID: 'test-client',
    COGNITO_REGION: 'eu-west-3',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
    FRONTEND_URL: 'https://app.example.com',
    AUTH_PORTAL_URL: 'https://auth.example.com',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    STRIPE_PRICE_STARTER_MONTHLY: 'price_starter_monthly',
    STRIPE_PRICE_STARTER_ANNUAL: 'price_starter_annual',
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: 'price_professional_monthly',
    STRIPE_PRICE_PROFESSIONAL_ANNUAL: 'price_professional_annual',
    STRIPE_PRICE_ENTERPRISE_MONTHLY: 'price_enterprise_monthly',
    STRIPE_PRICE_ENTERPRISE_ANNUAL: 'price_enterprise_annual',
    POSTMARK_API_KEY: 'postmark_mock',
    AWS_REGION: 'eu-west-3',
    AWS_S3_ACCESS_KEY_ID: 'aws-key',
    AWS_S3_SECRET_ACCESS_KEY: 'aws-secret',
    AWS_S3_BUCKET_NAME: 'test-bucket',
    OPENAI_API_KEY: 'openai_mock',
    CORS_ORIGINS: ['http://localhost:5173'],
    TURN_CREDENTIAL_TTL: 3600,
    ENABLE_SWAGGER: true,
    ENABLE_METRICS: false,
    ENABLE_RATE_LIMIT: false,
    LOG_LEVEL: 'error',
    LOG_FORMAT: 'json',
  },
}))

mock.module('../../../infrastructure/auth/auth.middleware', () => ({
  requireAuthMiddleware: async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
    c.set('user', { id: 'user-1', email: 'user@example.com' })
    await next()
  },
}))

mock.module('../../activity/activity.application', () => ({
  activityApplicationService: {
    logEvent: mock(async () => undefined),
  },
}))

mock.module('../../metrics/middleware/metrics.middleware', () => ({
  trackNewVisitorMiddleware: async (_c: Context<{ Variables: CommonVariables }>, next: Next) => {
    await next()
  },
}))

const { default: organizationRoutes } = await import('../presentation/organization.routes')

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/organizations', organizationRoutes)
  return app
}

describe('Organization routes', () => {
  beforeEach(() => {
    mockOrganizationApplicationService.getShowcaseData.mockReset()
    mockOrganizationApplicationService.getShowcaseData.mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Ortelius',
        slug: 'ortelius',
        logo: null,
        tagline: null,
        overview: null,
        website: null,
        brandColor: '#0103B8',
        font: DEFAULT_ORGANIZATION_FONT,
        createdAt: new Date('2026-05-07T00:00:00.000Z'),
        memberCount: 2,
      },
      stats: { profileViews: 0, requestsHandled: 0, responseRate: 0 },
      services: [],
      cargoTypes: [],
    })
    mockOrganizationApplicationService.getBySlug.mockReset()
    mockOrganizationApplicationService.getBySlug.mockResolvedValue({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
      font: DEFAULT_ORGANIZATION_FONT,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    mockOrganizationApplicationService.getInfo.mockReset()
    mockOrganizationApplicationService.getInfo.mockResolvedValue({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      taxIdType: 'vat',
      taxIdNumber: 'BE123',
      emailIntakeEnabled: true,
      font: DEFAULT_ORGANIZATION_FONT,
    })
    mockOrganizationApplicationService.getSetupStatus.mockReset()
    mockOrganizationApplicationService.getSetupStatus.mockResolvedValue({
      hasLogo: true,
      hasTagline: true,
      hasOverview: false,
      hasServices: true,
      hasCargoTypes: true,
      hasVatConfig: true,
      hasLegalDocuments: false,
      memberCount: 2,
      isComplete: true,
    })
    mockOrganizationApplicationService.getDashboard.mockReset()
    mockOrganizationApplicationService.getDashboard.mockResolvedValue({
      members: [],
      totalMembers: 0,
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
    })
    mockOrganizationApplicationService.listMembers.mockReset()
    mockOrganizationApplicationService.listMembers.mockResolvedValue({
      members: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      hasNextPage: false,
      userRole: 'admin',
    })
    mockOrganizationApplicationService.getUserRole.mockReset()
    mockOrganizationApplicationService.getUserRole.mockResolvedValue('admin')
    mockOrganizationApplicationService.updateSettings.mockReset()
    mockOrganizationApplicationService.updateSettings.mockResolvedValue(undefined)
    mockOrganizationApplicationService.notifyRealtimeUpdate.mockReset()
    mockOrganizationApplicationService.notifyRealtimeUpdate.mockResolvedValue(undefined)
    mockOrganizationApplicationService.updateTaxId.mockReset()
    mockOrganizationApplicationService.updateTaxId.mockResolvedValue(undefined)
    mockOrganizationApplicationService.updateEmailIntake.mockReset()
    mockOrganizationApplicationService.updateEmailIntake.mockResolvedValue({
      success: true,
      emailAddress: 'ortelius@inbound.ortelius.app',
    })
    mockOrganizationApplicationService.updateMemberRole.mockReset()
    mockOrganizationApplicationService.updateMemberRole.mockResolvedValue({
      id: 'member-1',
      role: 'admin',
    })
    mockOrganizationApplicationService.leaveOrganization.mockReset()
    mockOrganizationApplicationService.leaveOrganization.mockResolvedValue(undefined)
    mockOrganizationApplicationService.removeMember.mockReset()
    mockOrganizationApplicationService.removeMember.mockResolvedValue(undefined)
    mockOrganizationApplicationService.updateLogo.mockReset()
    mockOrganizationApplicationService.updateLogo.mockResolvedValue({
      logoUrl: 'https://cdn.example.com/logo.png',
    })
    mockOrganizationApplicationService.removeLogo.mockReset()
    mockOrganizationApplicationService.removeLogo.mockResolvedValue(undefined)

    mockCategoriesApplicationService.getByOrganization.mockReset()
    mockCategoriesApplicationService.getByOrganization.mockResolvedValue([])
    mockCategoriesApplicationService.getWithSelectionStatus.mockReset()
    mockCategoriesApplicationService.getWithSelectionStatus.mockResolvedValue([])
    mockCategoriesApplicationService.updateOrganizationCategories.mockReset()
    mockCategoriesApplicationService.updateOrganizationCategories.mockResolvedValue([])
  })

  it('loads showcase data through the application service', async () => {
    const response = await createApp().request('/organizations/ortelius/showcase?days=30')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.organization.font).toBe(DEFAULT_ORGANIZATION_FONT)
    expect(mockOrganizationApplicationService.getShowcaseData).toHaveBeenCalledWith('ortelius', 30)
  })

  it('returns a matching not found contract for missing showcase organizations', async () => {
    mockOrganizationApplicationService.getShowcaseData.mockRejectedValueOnce(
      new Error('Organization not found')
    )

    const response = await createApp().request('/organizations/missing/showcase?days=30')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Organization not found',
    })
  })

  it('does not expose category selection service errors through organization routes', async () => {
    mockCategoriesApplicationService.getWithSelectionStatus.mockRejectedValueOnce(
      new Error('database password=secret')
    )

    const response = await createApp().request('/organizations/org-1/categories/all')
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch categories with selection status',
    })
  })

  it('loads an organization by slug through the application service', async () => {
    const response = await createApp().request('/organizations/by-slug/ortelius')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.slug).toBe('ortelius')
    expect(json.data.font).toBe(DEFAULT_ORGANIZATION_FONT)
    expect(mockOrganizationApplicationService.getBySlug).toHaveBeenCalledWith('ortelius')
  })

  it('returns 404 when an organization slug is missing', async () => {
    mockOrganizationApplicationService.getBySlug.mockResolvedValue(null)

    const response = await createApp().request('/organizations/by-slug/missing')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
  })

  it('loads organization info through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/info')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.emailIntakeEnabled).toBe(true)
    expect(json.data.font).toBe(DEFAULT_ORGANIZATION_FONT)
    expect(mockOrganizationApplicationService.getInfo).toHaveBeenCalledWith('org-1')
  })

  it('loads setup status through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/setup-status')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.isComplete).toBe(true)
    expect(mockOrganizationApplicationService.getSetupStatus).toHaveBeenCalledWith(
      'org-1',
      'user-1'
    )
  })

  it('loads the user role through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/user/role')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.role).toBe('admin')
    expect(mockOrganizationApplicationService.getUserRole).toHaveBeenCalledWith('org-1', 'user-1')
  })

  it('loads dashboard data through the organization application service', async () => {
    const response = await createApp().request('/organizations/org-1/dashboard?page=2&limit=5')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.getDashboard).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.objectContaining({ page: 2, limit: 5 })
    )
  })

  it('lists members through the organization application service', async () => {
    const response = await createApp().request('/organizations/org-1/members?role=admin')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.listMembers).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.objectContaining({ role: 'admin' })
    )
  })

  it('updates organization settings through the application service', async () => {
    const response = await createApp().request('/organizations/org-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ortelius Logistics',
        slug: 'ortelius-logistics',
        tagline: 'New tagline',
      }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.updateSettings).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      expect.objectContaining({
        name: 'Ortelius Logistics',
        slug: 'ortelius-logistics',
        tagline: 'New tagline',
      })
    )
    expect(mockOrganizationApplicationService.notifyRealtimeUpdate).toHaveBeenCalledWith(
      'org-1',
      'ortelius'
    )
  })

  it('updates organization font settings', async () => {
    const response = await createApp().request('/organizations/org-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ font: 'ibm-plex-sans' }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.updateSettings).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      {
        font: 'ibm-plex-sans',
      }
    )
    expect(mockOrganizationApplicationService.notifyRealtimeUpdate).toHaveBeenCalledWith(
      'org-1',
      null
    )
  })

  it('rejects invalid organization font settings before the application service', async () => {
    const response = await createApp().request('/organizations/org-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        font: 'sf-pro',
      }),
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.details.issues).toContainEqual(
      expect.objectContaining({
        path: 'font',
        message: expect.stringContaining('Font must be one of'),
      })
    )
    expect(mockOrganizationApplicationService.updateSettings).not.toHaveBeenCalled()
  })

  it('maps organization settings permission failures to forbidden responses', async () => {
    mockOrganizationApplicationService.updateSettings.mockRejectedValueOnce(
      new Error('Insufficient permissions. Admin or Owner role required')
    )

    const response = await createApp().request('/organizations/org-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ font: 'ibm-plex-sans' }),
    })
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.code).toBe('FORBIDDEN')
  })

  it('updates organization tax id through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/tax-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxIdType: 'vat', taxIdNumber: 'BE123' }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.updateTaxId).toHaveBeenCalledWith('org-1', 'user-1', {
      taxIdType: 'vat',
      taxIdNumber: 'BE123',
    })
  })

  it('updates email intake through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/email-intake', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.emailAddress).toBe('ortelius@inbound.ortelius.app')
    expect(mockOrganizationApplicationService.updateEmailIntake).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      true
    )
  })

  it('updates a member role through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/members/member-1/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.updateMemberRole).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'member-1',
      'admin'
    )
  })

  it('lets the current member leave through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/members/me', {
      method: 'DELETE',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.leaveOrganization).toHaveBeenCalledWith(
      'org-1',
      'user-1'
    )
  })

  it('removes a member through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/members/member-1', {
      method: 'DELETE',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.removeMember).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'member-1'
    )
  })

  it('removes a logo through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/logo', {
      method: 'DELETE',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockOrganizationApplicationService.removeLogo).toHaveBeenCalledWith('org-1', 'user-1')
    expect(mockOrganizationApplicationService.notifyRealtimeUpdate).toHaveBeenCalledWith('org-1')
  })

  it('maps logo removal failures to matching status and error codes', async () => {
    mockOrganizationApplicationService.removeLogo.mockRejectedValueOnce(
      new Error('Insufficient permissions')
    )

    const forbiddenResponse = await createApp().request('/organizations/org-1/logo', {
      method: 'DELETE',
    })
    const forbiddenJson = await forbiddenResponse.json()

    expect(forbiddenResponse.status).toBe(403)
    expect(forbiddenJson).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    })

    mockOrganizationApplicationService.removeLogo.mockRejectedValueOnce(
      new Error('database password=secret')
    )

    const internalResponse = await createApp().request('/organizations/org-1/logo', {
      method: 'DELETE',
    })
    const internalJson = await internalResponse.json()

    expect(internalResponse.status).toBe(500)
    expect(internalJson).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to remove organization logo',
    })
  })
})
