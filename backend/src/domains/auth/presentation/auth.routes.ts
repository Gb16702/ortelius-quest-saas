import { Hono } from 'hono'
import { createWebSocketTicket } from '../../../infrastructure/auth/websocket-ticket.service'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson } from '../../../infrastructure/validation/validation.utils'
import type { CheckAuthProviderResponse } from '../application/auth-models'
import { type AuthApplicationService, authApplicationService } from '../auth.application'
import { checkAuthProviderSchema } from './auth.schemas'

type AuthRouteService = Pick<AuthApplicationService, 'checkAuthProvider'>

export function createAuthRoutes(service: AuthRouteService = authApplicationService) {
  const authRoutes = new Hono<{ Variables: CommonVariables }>()

  authRoutes.get('/profile', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated'), 401)
    }
    return c.json(user)
  })

  authRoutes.post('/ws-ticket', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required'), 401)
    }

    const ticket = createWebSocketTicket(user.id)

    return c.json(
      {
        success: true,
        data: {
          ticket: ticket.token,
          token: ticket.token,
          expiresIn: ticket.expiresIn,
          expiresAt: ticket.expiresAt,
        },
        ticket: ticket.token,
        token: ticket.token,
        expiresIn: ticket.expiresIn,
        expiresAt: ticket.expiresAt,
      },
      200
    )
  })

  authRoutes.post('/check-auth-provider', validateJson(checkAuthProviderSchema), async (c) => {
    try {
      const { email } = c.req.valid('json')

      const data = await service.checkAuthProvider(email)

      const response: ApiResponse<CheckAuthProviderResponse> = {
        success: true,
        data,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to check auth provider'
      )
      return c.json(response, 500)
    }
  })

  return authRoutes
}

export default createAuthRoutes()
