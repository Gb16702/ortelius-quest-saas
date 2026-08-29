import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { OrganizationNotFoundError } from '../application/organization-errors'

const testUser = { id: 'user-1', email: 'user@example.com' }

const mockOrganizationApplicationService = {
  getStatus: mock(async () => ({
    organization: {
      id: 'org-1',
      name: 'Ortelius',
      status: 'pending',
      slug: 'ortelius',
    },
    subscription: null,
    isActive: false,
    isPending: true,
    isSuspended: false,
    requiresSubscription: true,
  })),
}

mock.module('../organization.application', () => ({
  organizationApplicationService: mockOrganizationApplicationService,
}))

const { default: organizationStatusRoutes } = await import(
  '../presentation/organization-status.routes'
)

function createApp(user: typeof testUser | null = testUser) {
  const app = new Hono<{ Variables: CommonVariables }>()
  if (user) {
    app.use('*', async (c, next) => {
      c.set('user', user)
      await next()
    })
  }
  app.route('/organizations', organizationStatusRoutes)
  return app
}

describe('Organization status routes', () => {
  beforeEach(() => {
    mockOrganizationApplicationService.getStatus.mockReset()
    mockOrganizationApplicationService.getStatus.mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Ortelius',
        status: 'pending',
        slug: 'ortelius',
      },
      subscription: null,
      isActive: false,
      isPending: true,
      isSuspended: false,
      requiresSubscription: true,
    })
  })

  it('returns status data from the application service', async () => {
    const response = await createApp().request('/organizations/org-1/status')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.organization.id).toBe('org-1')
    expect(json.requiresSubscription).toBe(true)
    expect(mockOrganizationApplicationService.getStatus).toHaveBeenCalledWith('org-1')
  })

  it('returns 401 when no user is present in context', async () => {
    const response = await createApp(null).request('/organizations/org-1/status')

    expect(response.status).toBe(401)
    expect(mockOrganizationApplicationService.getStatus).not.toHaveBeenCalled()
  })

  it('returns 404 when the organization does not exist', async () => {
    mockOrganizationApplicationService.getStatus.mockRejectedValue(new OrganizationNotFoundError())

    const response = await createApp().request('/organizations/missing/status')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Organization not found',
    })
  })
})
