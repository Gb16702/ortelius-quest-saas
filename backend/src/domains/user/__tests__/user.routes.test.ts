import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'

const profile = {
  user: {
    id: 'user-123',
    name: 'Test User',
    image: 'https://cdn.example.com/avatars/user-123/avatar',
    dominantColor: null,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
  },
  organization: {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    logo: 'https://s3.bucket.com/logos/logo.jpg',
  },
}

const userService = {
  updateUserName: mock(async (_userId: string, name: string) => ({ name })),
  getUserProfile: mock(async () => profile),
  updateUserStatus: mock(async (_userId: string, status: string) => ({ status })),
}

const authMiddleware = async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
  c.set('user', { id: 'user-123', email: 'test@example.com' } as never)
  await next()
}

mock.module('../user.application', () => ({
  userApplicationService: userService,
}))

const { createUserRoutes } = await import('../presentation/user.routes')

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/user', createUserRoutes(userService, authMiddleware))
  return app
}

describe('User routes', () => {
  beforeEach(() => {
    Object.values(userService).forEach((fn) => fn.mockClear())
    userService.getUserProfile.mockResolvedValue(profile)
  })

  it('updates the current user name', async () => {
    const response = await createApp().request('/user/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Ada' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, data: { name: 'Ada' } })
    expect(userService.updateUserName).toHaveBeenCalledWith('user-123', 'Ada')
  })

  it('returns a user profile and preserves missing profile 404s', async () => {
    const response = await createApp().request('/user/user-123/profile')
    const json = await response.json()

    userService.getUserProfile.mockResolvedValueOnce(null)
    const missingResponse = await createApp().request('/user/missing/profile')
    const missingJson = await missingResponse.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.user.id).toBe('user-123')
    expect(missingResponse.status).toBe(404)
    expect(missingJson).toEqual({ success: false, code: 'NOT_FOUND', message: 'User not found' })
  })

  it('updates the current user status', async () => {
    const response = await createApp().request('/user/me/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'busy' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, data: { status: 'busy' } })
    expect(userService.updateUserStatus).toHaveBeenCalledWith('user-123', 'busy')
  })
})
