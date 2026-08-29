import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../../infrastructure/types/api.types'
import { validateParam } from '../../../../infrastructure/validation/validation.utils'
import {
  MessageReadConversationNotFoundError,
  MessageReadForbiddenError,
  MessageReadMessageNotFoundError,
  MessageReadOwnMessageError,
} from '../domain'
import {
  type MessageReadApplicationService,
  messageReadApplicationService,
} from '../message-read.application'
import { conversationIdParamSchema, messageIdParamSchema } from './message-read.schemas'

type MessageReadRouteService = Pick<
  MessageReadApplicationService,
  'markMessageAsRead' | 'markConversationAsRead' | 'getConversationReadStatuses'
>

function mapMessageReadError(error: unknown): {
  status: 400 | 403 | 404 | 500
  response: ApiResponse
} {
  if (error instanceof MessageReadMessageNotFoundError) {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, 'Message not found'),
    }
  }

  if (error instanceof MessageReadConversationNotFoundError) {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, 'Conversation not found'),
    }
  }

  if (error instanceof MessageReadOwnMessageError) {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Cannot mark own message as read'),
    }
  }

  if (error instanceof MessageReadForbiddenError) {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, 'Access denied'),
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error'),
  }
}

export function createMessageReadRoutes(
  service: MessageReadRouteService = messageReadApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const messageReadRoutes = new Hono<{ Variables: CommonVariables }>()

  messageReadRoutes.patch(
    '/messages/:messageId/read',
    authMiddleware,
    validateParam(messageIdParamSchema),
    async (c) => {
      try {
        const { messageId } = c.req.valid('param')
        const user = c.get('user')!

        const result = await service.markMessageAsRead(messageId, user.id)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          message: 'Message marked as read successfully',
        }

        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageReadError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  messageReadRoutes.patch(
    '/conversations/:conversationId/read',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const { conversationId } = c.req.valid('param')
        const user = c.get('user')!

        const result = await service.markConversationAsRead(conversationId, user.id)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          message: 'Conversation marked as read successfully',
        }

        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageReadError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  messageReadRoutes.post(
    '/conversations/:conversationId/mark-read',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const { conversationId } = c.req.valid('param')
        const user = c.get('user')!

        const result = await service.markConversationAsRead(conversationId, user.id)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          message: 'Conversation marked as read successfully',
        }

        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageReadError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  messageReadRoutes.get(
    '/conversations/:conversationId/read-status',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const { conversationId } = c.req.valid('param')
        const user = c.get('user')!

        const result = await service.getConversationReadStatuses(conversationId, user.id)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
        }

        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageReadError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  return messageReadRoutes
}

export default createMessageReadRoutes()
