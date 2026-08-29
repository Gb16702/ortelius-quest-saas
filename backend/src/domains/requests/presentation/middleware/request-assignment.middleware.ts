import type { Context, Next } from 'hono'
import { createApiErrorResponse, ErrorCode } from '../../../../infrastructure/types/api.types'
import { requestsApplicationService } from '../../requests.application'

export async function canAssignRequests(organizationId: string, userId: string): Promise<boolean> {
  return await requestsApplicationService.canAssignRequests(organizationId, userId)
}

export async function canViewAssignedRequests(requestId: string, userId: string): Promise<boolean> {
  return await requestsApplicationService.canViewAssignedRequests(requestId, userId)
}

export const requireAssignmentPermission = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required'), 401)
    }

    let organizationId: string | null | undefined =
      c.req.param('organizationId') || c.req.header('x-organization-id')

    if (!organizationId) {
      const requestId = c.req.param('id') || c.req.param('requestId')
      if (requestId) {
        try {
          organizationId = await requestsApplicationService.getRequestOrganizationId(requestId)
        } catch (_error) {
          return c.json(
            createApiErrorResponse(
              ErrorCode.INTERNAL_SERVER_ERROR,
              'Failed to fetch request details'
            ),
            500
          )
        }
      }
    }

    if (!organizationId) {
      return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Request not found'), 404)
    }

    const hasPermission = await canAssignRequests(organizationId, user.id)
    if (!hasPermission) {
      return c.json(
        createApiErrorResponse(
          ErrorCode.FORBIDDEN,
          'You must be a member of the organization to assign requests'
        ),
        403
      )
    }

    await next()
  }
}

export const requireRequestViewPermission = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required'), 401)
    }

    const requestId = c.req.param('requestId')
    if (!requestId) {
      return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Request ID required'), 400)
    }

    const hasPermission = await canViewAssignedRequests(requestId, user.id)
    if (!hasPermission) {
      return c.json(
        createApiErrorResponse(
          ErrorCode.FORBIDDEN,
          'Insufficient permissions to view this request'
        ),
        403
      )
    }

    await next()
  }
}
