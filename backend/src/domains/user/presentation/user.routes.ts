import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import { type UserApplicationService, userApplicationService } from '../user.application'
import { updateStatusSchema, updateUserNameSchema, userIdParamSchema } from './user.schemas'

type UserRouteService = Pick<
  UserApplicationService,
  'updateUserName' | 'getUserProfile' | 'updateUserStatus'
>

export function createUserRoutes(
  service: UserRouteService = userApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const user = new Hono<{ Variables: CommonVariables }>()

  user.patch('/me', authMiddleware, validateJson(updateUserNameSchema), async (c) => {
    try {
      const authUser = c.get('user')!
      const { name } = c.req.valid('json')

      const result = await service.updateUserName(authUser.id, name)

      const response: ApiResponse<{ name: string }> = {
        success: true,
        data: result,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error'
      )
      return c.json(response, 500)
    }
  })

  user.get('/:userId/profile', validateParam(userIdParamSchema), async (c) => {
    try {
      const { userId } = c.req.valid('param')
      const profile = await service.getUserProfile(userId)

      if (!profile) {
        const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, 'User not found')
        return c.json(response, 404)
      }

      const response: ApiResponse = {
        success: true,
        data: profile,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error'
      )
      return c.json(response, 500)
    }
  })

  user.patch('/me/status', authMiddleware, validateJson(updateStatusSchema), async (c) => {
    try {
      const authUser = c.get('user')!
      const { status } = c.req.valid('json')
      const result = await service.updateUserStatus(authUser.id, status)

      const response: ApiResponse<{ status: typeof status }> = {
        success: true,
        data: result,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error'
      )
      return c.json(response, 500)
    }
  })

  return user
}

export default createUserRoutes()
