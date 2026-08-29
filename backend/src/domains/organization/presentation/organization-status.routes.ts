import { Hono } from 'hono'
import {
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { OrganizationNotFoundError } from '../application/organization-errors'
import { organizationApplicationService } from '../organization.application'

const organizationStatusRoutes = new Hono<{ Variables: CommonVariables }>()

organizationStatusRoutes.get('/:organizationId/status', async (c) => {
  const user = c.get('user')

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const organizationId = c.req.param('organizationId')

  try {
    const status = await organizationApplicationService.getStatus(organizationId)
    return c.json(status)
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) {
      return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, error.message), 404)
    }

    console.error('Error fetching organization status:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch status'),
      500
    )
  }
})

export default organizationStatusRoutes
