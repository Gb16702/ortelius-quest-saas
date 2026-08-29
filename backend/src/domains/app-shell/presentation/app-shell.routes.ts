import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateParam } from '../../../infrastructure/validation/validation.utils'
import { organizationIdParamSchema } from '../../organization/presentation/organization.schemas'
import { loadSidebarBootstrap } from '../infrastructure/sidebar-bootstrap-query.service'

const appShellRoutes = new Hono<{ Variables: CommonVariables }>()

function errorResponse(error: unknown, fallback: string): ApiResponse {
  console.error('[app-shell] route error:', error)
  return createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback)
}

appShellRoutes.get(
  '/organizations/:organizationId/sidebar-bootstrap',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const user = c.get('user')!
      const { organizationId } = c.req.valid('param')

      const bootstrap = await loadSidebarBootstrap(user.id, organizationId)

      return c.json(
        {
          success: true,
          data: bootstrap,
        },
        200
      )
    } catch (error) {
      return c.json(errorResponse(error, 'Failed to load sidebar bootstrap'), 500)
    }
  }
)

export default appShellRoutes
