import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { AuthVariables } from '../../../infrastructure/auth/auth.middleware'
import type { MemberProfileResponse } from '../application/member-profile-models'
import { MemberProfileNotFoundError, MemberProfilePermissionError } from '../domain'

const profile: MemberProfileResponse = {
  user: {
    id: 'target-user',
    name: 'Target User',
    email: 'target@example.com',
    image: null,
    dominantColor: null,
    createdAt: new Date('2026-05-02T00:00:00.000Z'),
  },
  membership: {
    id: 'membership-target',
    organizationId: 'org-123',
    role: 'member',
    joinedAt: new Date('2026-05-01T00:00:00.000Z'),
  },
  assignedRequests: [
    {
      id: 'request-1',
      requestNumber: 'REQ-1',
      lifecycleStatus: 'open',
      closedReason: null,
      categories: ['cargo'],
      services: ['transport'],
      createdAt: new Date('2026-05-03T00:00:00.000Z'),
    },
  ],
}

const mockMembersApplicationService = {
  getMemberProfile: mock((): Promise<MemberProfileResponse> => Promise.resolve(profile)),
}
const originalConsoleError = console.error

mock.module('../members.application', () => ({
  membersApplicationService: mockMembersApplicationService,
}))

const { default: membersRoutes } = await import('../presentation/members.routes')

function createApp(authenticated = true) {
  const app = new Hono<{ Variables: AuthVariables }>()
  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('user', {
        id: 'requesting-user',
        email: 'requesting@example.com',
        name: 'Requesting User',
        image: null,
        role: 'member',
      })
      await next()
    })
  }
  app.route('/members', membersRoutes)
  return app
}

describe('Members routes', () => {
  beforeEach(() => {
    console.error = mock(() => undefined) as typeof console.error
    mockMembersApplicationService.getMemberProfile.mockReset()
    mockMembersApplicationService.getMemberProfile.mockResolvedValue(profile)
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it('returns a member profile through the application facade', async () => {
    const response = await createApp().request('/members/target-user/profile')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject({
      user: { id: 'target-user', name: 'Target User' },
      membership: { role: 'member' },
      assignedRequests: [{ id: 'request-1', requestNumber: 'REQ-1' }],
    })
    expect(mockMembersApplicationService.getMemberProfile).toHaveBeenCalledWith(
      'target-user',
      'requesting-user'
    )
  })

  it('requires authentication', async () => {
    const response = await createApp(false).request('/members/target-user/profile')
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json).toEqual({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' })
    expect(mockMembersApplicationService.getMemberProfile).not.toHaveBeenCalled()
  })

  it('preserves forbidden responses for membership and profile lookup failures', async () => {
    mockMembersApplicationService.getMemberProfile.mockRejectedValueOnce(
      new MemberProfilePermissionError('Target user is not a member of the same organization')
    )

    const permissionResponse = await createApp().request('/members/target-user/profile')
    const permissionJson = await permissionResponse.json()

    mockMembersApplicationService.getMemberProfile.mockRejectedValueOnce(
      new MemberProfileNotFoundError('User not found')
    )

    const notFoundResponse = await createApp().request('/members/target-user/profile')
    const notFoundJson = await notFoundResponse.json()

    expect(permissionResponse.status).toBe(403)
    expect(permissionJson).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Target user is not a member of the same organization',
    })
    expect(notFoundResponse.status).toBe(403)
    expect(notFoundJson).toEqual({ success: false, code: 'FORBIDDEN', message: 'User not found' })
  })

  it('returns unexpected errors as server errors', async () => {
    mockMembersApplicationService.getMemberProfile.mockRejectedValue(new Error('Database error'))

    const response = await createApp().request('/members/target-user/profile')
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unknown error occurred',
    })
  })
})
