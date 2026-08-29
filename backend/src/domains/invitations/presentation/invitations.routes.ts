import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateParam } from '../../../infrastructure/validation/validation.utils'
import {
  type InvitationApplicationService,
  invitationApplicationService,
} from '../invitations.application'
import { invitationIdParamSchema } from './invitations.schemas'

type InvitationRouteService = Pick<
  InvitationApplicationService,
  'getInvitationDetails' | 'acceptInvitation'
>

function mapAcceptInvitationError(error: unknown): {
  status: 400 | 403 | 404 | 409 | 500
  response: ApiResponse
} {
  const message = error instanceof Error ? error.message : ''

  if (message === 'Invitation not found') {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, message),
    }
  }

  if (message === 'This invitation belongs to a different email address') {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, message),
    }
  }

  if (message === 'User is already a member of another organization') {
    return {
      status: 409,
      response: createApiErrorResponse(ErrorCode.CONFLICT, message),
    }
  }

  if (message === 'Invitation is not in pending status' || message === 'Invitation has expired') {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, message),
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to accept invitation'
    ),
  }
}

export function createInvitationsRoutes(
  service: InvitationRouteService = invitationApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const invitations = new Hono<{ Variables: CommonVariables }>()

  invitations.get(
    '/invitation/:invitationId',
    validateParam(invitationIdParamSchema),
    async (c) => {
      try {
        const { invitationId } = c.req.valid('param')
        const invitationDetails = await service.getInvitationDetails(invitationId)

        if (!invitationDetails) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.NOT_FOUND,
            'Invitation not found'
          )
          return c.json(response, 404)
        }

        const response: ApiResponse<typeof invitationDetails> = {
          success: true,
          data: invitationDetails,
        }
        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to get invitation details'
        )
        return c.json(response, 500)
      }
    }
  )

  invitations.post(
    '/invitation/:invitationId/accept',
    authMiddleware,
    validateParam(invitationIdParamSchema),
    async (c) => {
      try {
        const { invitationId } = c.req.valid('param')
        const user = c.get('user')!

        const result = await service.acceptInvitation(invitationId, user.id, user.email)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          message: result.message,
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapAcceptInvitationError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  return invitations
}

export default createInvitationsRoutes()
