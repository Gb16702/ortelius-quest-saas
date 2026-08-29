import { type Context, Hono, type Next } from 'hono'
import { z } from 'zod'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import {
  validateJson,
  validateParam,
  validateQuery,
} from '../../../infrastructure/validation/validation.utils'
import type { Request, RequestWithRelations } from '../application/request-models'
import {
  RequestDomainError,
  RequestNotFoundError,
  RequestShareForbiddenError,
  RequestTeamChatNotFoundError,
} from '../domain/errors'
import { requestsApplicationService } from '../requests.application'
import { requireRequestActionPermission } from './middleware/request-action.middleware'
import { requireAssignmentPermission } from './middleware/request-assignment.middleware'
import {
  assignRequestSchema,
  createRequestSchema,
  linkRequestsSchema,
  rejectRequestSchema,
  requestFiltersSchema,
  requestIdParamSchema,
  requestNumberParamSchema,
  updateRequestSchema,
} from './requests.schemas'

const requests = new Hono<{ Variables: CommonVariables }>()

function createRequestNotFoundResponse(): ApiResponse {
  return createApiErrorResponse(ErrorCode.NOT_FOUND, 'Request not found')
}

function createRequestForbiddenResponse(message: string): ApiResponse {
  return createApiErrorResponse(ErrorCode.FORBIDDEN, message)
}

function isPlatformAdmin(user: CommonVariables['user']): boolean {
  return user?.role === 'admin'
}

const requirePlatformAdminRoute = async (
  c: Context<{ Variables: CommonVariables }>,
  next: Next
) => {
  const user = c.get('user')

  if (!isPlatformAdmin(user)) {
    return c.json(createRequestForbiddenResponse('Platform admin access required'), 403)
  }

  await next()
}

function mapRequestRouteError(
  error: unknown,
  fallback: string
): {
  status: 400 | 403 | 404 | 500
  response: ApiResponse
} {
  if (error instanceof RequestDomainError) {
    switch (error.code) {
      case 'REQUEST_NOT_FOUND':
        return {
          status: 404,
          response: createApiErrorResponse(ErrorCode.NOT_FOUND, error.message),
        }
      case 'REQUEST_CANCEL_FORBIDDEN':
      case 'REQUEST_ORGANIZATION_FORBIDDEN':
      case 'REQUEST_SHARE_FORBIDDEN':
        return {
          status: 403,
          response: createApiErrorResponse(ErrorCode.FORBIDDEN, error.message),
        }
      case 'INVALID_REQUEST_ASSIGNMENT':
      case 'INVALID_REQUEST_STATE':
        return {
          status: 400,
          response: createApiErrorResponse(ErrorCode.BAD_REQUEST, error.message),
        }
      case 'REQUEST_TEAM_CHAT_NOT_FOUND':
        return {
          status: 404,
          response: createApiErrorResponse(ErrorCode.NOT_FOUND, error.message),
        }
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback),
  }
}

requests.get('/', requireAuthMiddleware, validateQuery(requestFiltersSchema), async (c) => {
  try {
    const filters = c.req.valid('query')
    const user = c.get('user')!

    const result = await requestsApplicationService.getAccessibleRequests(user.id, filters)

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    }
    return c.json(response, 200)
  } catch (error) {
    const mapped = mapRequestRouteError(error, 'Failed to fetch requests')
    return c.json(mapped.response, mapped.status)
  }
})

requests.post('/', validateJson(createRequestSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    const user = c.get('user')

    const requestData = user ? { ...data, requesterId: user.id } : data

    const request = await requestsApplicationService.createRequest(requestData)

    const response: ApiResponse<Request> = {
      success: true,
      data: request,
      message: 'Request created successfully',
    }

    return c.json(response, 201)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to create request'
    )
    return c.json(response, 500)
  }
})

requests.patch(
  '/:id',
  requireAuthMiddleware,
  requireRequestActionPermission(),
  validateParam(requestIdParamSchema),
  validateJson(updateRequestSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')
      const user = c.get('user')!

      const request = await requestsApplicationService.updateRequest(id, data, user.id)

      const response: ApiResponse<Request> = {
        success: true,
        data: request,
        message: 'Request updated successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update request'
      )
      return c.json(response, 500)
    }
  }
)

requests.get('/:id', requireAuthMiddleware, validateParam(requestIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const user = c.get('user')!
    const accessibleRequestId = await requestsApplicationService.resolveAccessibleRequestById(
      id,
      user.id
    )

    if (!accessibleRequestId) {
      return c.json(createRequestNotFoundResponse(), 404)
    }

    const request = await requestsApplicationService.getRequestById(accessibleRequestId)

    if (!request) {
      return c.json(createRequestNotFoundResponse(), 404)
    }

    const response: ApiResponse<RequestWithRelations> = {
      success: true,
      data: request,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to fetch request'
    )
    return c.json(response, 500)
  }
})

requests.get(
  '/by-number/:requestNumber',
  requireAuthMiddleware,
  validateParam(requestNumberParamSchema),
  async (c) => {
    try {
      const { requestNumber } = c.req.valid('param')
      const user = c.get('user')!
      const accessibleRequestId = await requestsApplicationService.resolveAccessibleRequestByNumber(
        requestNumber,
        user.id
      )

      if (!accessibleRequestId) {
        return c.json(createRequestNotFoundResponse(), 404)
      }

      const request = await requestsApplicationService.getRequestById(accessibleRequestId)

      if (!request) {
        return c.json(createRequestNotFoundResponse(), 404)
      }

      const response: ApiResponse<RequestWithRelations> = {
        success: true,
        data: request,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch request'
      )
      return c.json(response, 500)
    }
  }
)

requests.get(
  '/user/:userId',
  requireAuthMiddleware,
  validateParam(z.object({ userId: z.string().min(1) })),
  validateQuery(requestFiltersSchema),
  async (c) => {
    try {
      const { userId } = c.req.valid('param')
      const filters = c.req.valid('query')
      const user = c.get('user')!

      if (!isPlatformAdmin(user) && userId !== user.id) {
        return c.json(createRequestForbiddenResponse('You can only access your own requests'), 403)
      }

      const targetUserId = isPlatformAdmin(user) ? userId : user.id
      const result = await requestsApplicationService.getUserRequests(targetUserId, filters)

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch user requests'
      )
      return c.json(response, 500)
    }
  }
)

requests.patch(
  '/:id/reject',
  requireAuthMiddleware,
  requireRequestActionPermission(),
  validateParam(requestIdParamSchema),
  validateJson(rejectRequestSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const { reason } = c.req.valid('json')
      const userId = c.get('userId') || c.get('user')?.id

      if (!userId) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.UNAUTHORIZED,
          'Authentication required'
        )
        return c.json(response, 401)
      }

      await requestsApplicationService.rejectRequest(id, userId, reason)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Request rejected successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to reject request'
      )
      return c.json(response, 500)
    }
  }
)

requests.patch(
  '/:id/validate',
  requireAuthMiddleware,
  requireRequestActionPermission(),
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const userId = c.get('userId') || c.get('user')?.id

      if (!userId) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.UNAUTHORIZED,
          'Authentication required'
        )
        return c.json(response, 401)
      }

      await requestsApplicationService.validateDraft(id, userId)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Draft validated successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to validate draft'
      )
      return c.json(response, 500)
    }
  }
)

requests.delete(
  '/:id',
  requireAuthMiddleware,
  requireRequestActionPermission(),
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const userId = c.get('userId') || c.get('user')?.id

      if (!userId) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.UNAUTHORIZED,
          'Authentication required'
        )
        return c.json(response, 401)
      }

      await requestsApplicationService.deleteDraft(id, userId)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Draft deleted successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to delete draft'
      )
      return c.json(response, 500)
    }
  }
)

requests.patch(
  '/:id/cancel',
  requireAuthMiddleware,
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const userId = c.get('userId') || c.get('user')?.id

      if (!userId) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.UNAUTHORIZED,
          'Authentication required'
        )
        return c.json(response, 401)
      }

      await requestsApplicationService.cancelRequest(id, userId)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Request cancelled successfully',
      }

      return c.json(response, 200)
    } catch (error) {
      const mapped = mapRequestRouteError(error, 'Failed to cancel request')
      return c.json(mapped.response, mapped.status)
    }
  }
)

requests.patch(
  '/link-to-user/:userId',
  requireAuthMiddleware,
  requirePlatformAdminRoute,
  validateParam(z.object({ userId: z.string().min(1) })),
  validateJson(linkRequestsSchema),
  async (c) => {
    try {
      const { userId } = c.req.valid('param')
      const { userEmail } = c.req.valid('json')

      await requestsApplicationService.linkRequestsToUser(userEmail, userId)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Requests linked to user successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to link requests to user'
      )
      return c.json(response, 500)
    }
  }
)

requests.post(
  '/:id/assign',
  requireAuthMiddleware,
  requireAssignmentPermission(),
  validateParam(requestIdParamSchema),
  validateJson(assignRequestSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const { assignedToId } = c.req.valid('json')
      const user = c.get('user')!

      await requestsApplicationService.assignRequestToMember(id, assignedToId, user.id)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Request assigned successfully',
      }

      return c.json(response, 200)
    } catch (error) {
      const mapped = mapRequestRouteError(error, 'Failed to assign request')
      return c.json(mapped.response, mapped.status)
    }
  }
)

requests.patch(
  '/:id/assign',
  requireAuthMiddleware,
  requireAssignmentPermission(),
  validateParam(requestIdParamSchema),
  validateJson(assignRequestSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const { assignedToId } = c.req.valid('json')
      const user = c.get('user')!

      await requestsApplicationService.reassignRequestToMember(id, assignedToId, user.id)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Request reassigned successfully',
      }

      return c.json(response, 200)
    } catch (error) {
      const mapped = mapRequestRouteError(error, 'Failed to reassign request')
      return c.json(mapped.response, mapped.status)
    }
  }
)

requests.delete(
  '/:id/assign',
  requireAuthMiddleware,
  requireAssignmentPermission(),
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const user = c.get('user')!

      await requestsApplicationService.unassignRequest(id, user.id)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Request unassigned successfully',
      }

      return c.json(response, 200)
    } catch (error) {
      const mapped = mapRequestRouteError(error, 'Failed to unassign request')
      return c.json(mapped.response, mapped.status)
    }
  }
)

requests.get('/assigned', requireAuthMiddleware, validateQuery(requestFiltersSchema), async (c) => {
  try {
    const filters = c.req.valid('query')
    const user = c.get('user')!
    const organizationId = c.req.header('x-organization-id')

    if (!organizationId) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.BAD_REQUEST,
        'Organization ID header required'
      )
      return c.json(response, 400)
    }

    const requests = await requestsApplicationService.getAssignedRequests(
      user.id,
      organizationId,
      filters
    )

    const response: ApiResponse<typeof requests> = {
      success: true,
      data: requests,
    }
    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get assigned requests'
    )
    return c.json(response, 500)
  }
})

requests.get(
  '/unassigned',
  requireAuthMiddleware,
  requireAssignmentPermission(),
  validateQuery(requestFiltersSchema),
  async (c) => {
    try {
      const filters = c.req.valid('query')
      const organizationId = c.req.header('x-organization-id')

      if (!organizationId) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.BAD_REQUEST,
          'Organization ID header required'
        )
        return c.json(response, 400)
      }

      const requests = await requestsApplicationService.getUnassignedRequests(
        organizationId,
        filters
      )

      const response: ApiResponse<typeof requests> = {
        success: true,
        data: requests,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to get unassigned requests'
      )
      return c.json(response, 500)
    }
  }
)

requests.get(
  '/organization/:organizationId/members',
  requireAuthMiddleware,
  requireAssignmentPermission(),
  validateParam(z.object({ organizationId: z.string().min(1) })),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')

      const members = await requestsApplicationService.getOrganizationMembers(organizationId)

      const response: ApiResponse<typeof members> = {
        success: true,
        data: members,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to get organization members'
      )
      return c.json(response, 500)
    }
  }
)

requests.post(
  '/:id/share-to-team-chat',
  requireAuthMiddleware,
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const user = c.get('user')!

      const message = await requestsApplicationService.shareRequestToTeamChat(id, user.id)

      const response: ApiResponse<typeof message> = {
        success: true,
        data: message,
        message: 'Request shared to team chat successfully',
      }

      return c.json(response, 200)
    } catch (error) {
      if (error instanceof RequestNotFoundError || error instanceof RequestTeamChatNotFoundError) {
        const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, error.message)
        return c.json(response, 404)
      }

      if (error instanceof RequestShareForbiddenError) {
        const response: ApiResponse = createApiErrorResponse(ErrorCode.FORBIDDEN, error.message)
        return c.json(response, 403)
      }

      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to share request to team chat'
      )
      return c.json(response, 500)
    }
  }
)

export default requests
