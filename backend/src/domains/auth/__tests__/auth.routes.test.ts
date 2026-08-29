import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { Hono } from 'hono'
import { verifyWebSocketTicket } from '../../../infrastructure/auth/websocket-ticket.service'
import { createAuthRoutes } from '../presentation/auth.routes'

const mockAuthService = {
  checkAuthProvider: mock(() =>
    Promise.resolve({ has_email_password: false, has_sso_provider: false })
  ),
}

const originalEncryptionKey = process.env.ENCRYPTION_KEY

describe('Auth Routes', () => {
  let app: Hono

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'
    app = new Hono()
    app.use('/auth/*', async (c, next) => {
      c.set('user', {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        role: 'member',
      })
      await next()
    })
    app.route('/auth', createAuthRoutes(mockAuthService))

    mockAuthService.checkAuthProvider.mockReset()
  })

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey
    }
  })

  describe('POST /auth/ws-ticket', () => {
    test('should issue a signed WebSocket ticket for the authenticated user', async () => {
      const res = await app.request('/auth/ws-ticket', { method: 'POST' })

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.ticket.startsWith('ws-ticket.')).toBe(true)
      expect(body.ticket).toBe(body.data.ticket)
      expect(verifyWebSocketTicket(body.data.ticket)).toBe('user-123')
    })
  })

  describe('POST /auth/check-auth-provider', () => {
    test('should check if user has email/password auth', async () => {
      mockAuthService.checkAuthProvider.mockResolvedValue({
        has_email_password: true,
        has_sso_provider: false,
      })

      const res = await app.request('/auth/check-auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.has_email_password).toBe(true)
      expect(body.data.has_sso_provider).toBe(false)
      expect(mockAuthService.checkAuthProvider).toHaveBeenCalledWith('test@example.com')
    })

    test('should return false when user does not exist', async () => {
      mockAuthService.checkAuthProvider.mockResolvedValue({
        has_email_password: false,
        has_sso_provider: false,
      })

      const res = await app.request('/auth/check-auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.has_email_password).toBe(false)
      expect(body.data.has_sso_provider).toBe(false)
    })

    test('should handle service errors gracefully', async () => {
      mockAuthService.checkAuthProvider.mockRejectedValue(new Error('Database error'))

      const res = await app.request('/auth/check-auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(res.status).toBe(500)
      const body = await res.json()

      expect(body.success).toBe(false)
      expect(body.code).toBe('INTERNAL_SERVER_ERROR')
      expect(body.message).toBe('Failed to check auth provider')
    })
  })

  describe('API Response Format', () => {
    test('should return consistent API response format on success', async () => {
      mockAuthService.checkAuthProvider.mockResolvedValue({
        has_email_password: true,
        has_sso_provider: false,
      })

      const res = await app.request('/auth/check-auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const body = await res.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('data')
      expect(body.success).toBe(true)
      expect(typeof body.data).toBe('object')
    })

    test('should return consistent API response format on error', async () => {
      mockAuthService.checkAuthProvider.mockRejectedValue(new Error('Test error'))

      const res = await app.request('/auth/check-auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const body = await res.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('code')
      expect(body).toHaveProperty('message')
      expect(body.success).toBe(false)
      expect(typeof body.code).toBe('string')
      expect(typeof body.message).toBe('string')
    })
  })
})
