import type { Context, Next } from 'hono'
import { createApiErrorResponse, ErrorCode } from '../types/api.types'
import {
  isTestAuthBypassEnabled,
  readBearerOrQueryCredential,
  readTestAuthBypassUserId,
} from './auth-credential'
import { CognitoTokenVerifier } from './cognito-token.verifier'
import { type AuthUser, resolveOrProvisionUser } from './user-provisioning.service'
import { verifyWebSocketTicket } from './websocket-ticket.service'

const verifier = new CognitoTokenVerifier({
  userPoolId: process.env.COGNITO_USERPOOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  region: process.env.COGNITO_REGION || 'eu-west-3',
})

export type { AuthUser }

export type AuthVariables = {
  user: AuthUser | null
  isAuthenticated: boolean
}

export const authMiddleware = async (c: Context, next: Next) => {
  const loadUserById = async (userId: string): Promise<AuthUser | null> => {
    const { db } = await import('../database')
    const { user: userTable } = await import('../database/db/schemas/auth-schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1)
    if (!row) return null
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role,
    } as AuthUser
  }

  const setAuthenticatedUser = (user: AuthUser) => {
    c.set('user', user)
    c.set('isAuthenticated', true)
  }

  // Explicit test-only auth bypass for local/E2E probes. Disabled unless
  // ENABLE_TEST_AUTH_BYPASS=true and NODE_ENV is development or test.
  if (isTestAuthBypassEnabled()) {
    const testUserId = readTestAuthBypassUserId(c)
    if (testUserId) {
      const user = await loadUserById(testUserId)
      if (user) {
        setAuthenticatedUser(user)
        return next()
      }
    }
  }

  const token = readBearerOrQueryCredential(c)

  if (token) {
    if (token.startsWith('ws-ticket.')) {
      const ticketUserId = verifyWebSocketTicket(token)
      if (ticketUserId) {
        const user = await loadUserById(ticketUserId)
        if (user) {
          setAuthenticatedUser(user)
          return next()
        }
      }
    }

    const payload = await verifier.verify(token)

    if (payload) {
      const resolved = await resolveOrProvisionUser(token, payload)
      if (resolved) {
        setAuthenticatedUser(resolved)
        return next()
      }
    }
  }

  c.set('user', null)
  c.set('isAuthenticated', false)
  return next()
}

export const requireAuthMiddleware = async (c: Context, next: Next) => {
  const u = c.get('user')
  if (!u) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required'), 401)
  }
  return next()
}
