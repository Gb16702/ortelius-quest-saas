import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../../infrastructure/types/api.types'
import {
  validateJson,
  validateParam,
  validateQuery,
} from '../../../../infrastructure/validation/validation.utils'
import {
  conversationIdParamSchema,
  conversationsQuerySchema,
  messageSearchQuerySchema,
  resolveConversationSchema,
} from '../../presentation/messaging.schemas'
import {
  type ConversationApplicationService,
  conversationApplicationService,
} from '../conversation.application'
import {
  ConversationAccessDeniedError,
  ConversationMemberDmForbiddenError,
  ConversationMemberDmValidationError,
} from '../domain'

type ConversationRouteService = Pick<
  ConversationApplicationService,
  | 'getUnreadConversationsCount'
  | 'getUserConversations'
  | 'getAllConversationMessages'
  | 'searchConversationMessages'
  | 'getPinnedMessages'
  | 'pinConversation'
  | 'unpinConversation'
  | 'getConversationParticipants'
  | 'resolveMemberDmConversation'
>

function errorResponse(error: unknown, fallback: string): ApiResponse {
  console.error('[conversation] route error:', error)
  return createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback)
}

function isConversationAccessDeniedError(error: unknown): boolean {
  return (
    error instanceof ConversationAccessDeniedError ||
    (error instanceof Error && error.message === 'Unauthorized access to this conversation')
  )
}

function mapConversationReadError(
  error: unknown,
  fallback: string
): {
  status: 403 | 500
  response: ApiResponse
} {
  if (isConversationAccessDeniedError(error)) {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, 'Access denied'),
    }
  }

  return {
    status: 500,
    response: errorResponse(error, fallback),
  }
}

export function createConversationRoutes(
  service: ConversationRouteService = conversationApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const conversation = new Hono<{ Variables: CommonVariables }>()

  conversation.get('/unread-count', authMiddleware, async (c) => {
    try {
      const user = c.get('user')!
      const { count, conversationIds } = await service.getUnreadConversationsCount(user.id)

      const response: ApiResponse = {
        success: true,
        data: { count, conversationIds },
      }
      return c.json(response, 200)
    } catch (error) {
      return c.json(errorResponse(error, 'Failed to get unread count'), 500)
    }
  })

  conversation.get('/', authMiddleware, validateQuery(conversationsQuerySchema), async (c) => {
    try {
      const user = c.get('user')!
      const { limit, offset, unread, search, type, sort } = c.req.valid('query')
      const result = await service.getUserConversations(
        user.id,
        limit,
        offset,
        unread,
        search,
        type,
        sort
      )

      const response: ApiResponse = {
        success: true,
        data: {
          conversations: result.conversations,
          pagination: {
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.conversations.length < result.total,
          },
        },
      }
      return c.json(response, 200)
    } catch (error) {
      return c.json(errorResponse(error, 'Failed to get conversations'), 500)
    }
  })

  conversation.post(
    '/resolve',
    authMiddleware,
    validateJson(resolveConversationSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { organizationId, targetUserId } = c.req.valid('json')
        const result = await service.resolveMemberDmConversation(
          organizationId,
          user.id,
          targetUserId
        )

        const response: ApiResponse = {
          success: true,
          data: result,
        }
        return c.json(response, 200)
      } catch (error) {
        if (error instanceof ConversationMemberDmValidationError) {
          return c.json(createApiErrorResponse(ErrorCode.VALIDATION_ERROR, error.message), 400)
        }
        if (error instanceof ConversationMemberDmForbiddenError) {
          return c.json(createApiErrorResponse(ErrorCode.FORBIDDEN, 'Forbidden'), 403)
        }

        return c.json(errorResponse(error, 'Failed to resolve conversation'), 500)
      }
    }
  )

  conversation.get(
    '/:conversationId/messages',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')

        const result = await service.getAllConversationMessages(conversationId, user.id)

        const response: ApiResponse = {
          success: true,
          data: {
            messages: result.messages,
            total: result.total,
          },
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapConversationReadError(error, 'Failed to get messages')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  conversation.get(
    '/:conversationId/messages/search',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    validateQuery(messageSearchQuerySchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')
        const { q } = c.req.valid('query')

        const result = await service.searchConversationMessages(conversationId, user.id, q)

        const response: ApiResponse = {
          success: true,
          data: {
            messages: result.messages,
            total: result.total,
          },
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapConversationReadError(error, 'Failed to search messages')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  conversation.get(
    '/:conversationId/messages/pinned',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')

        const messages = await service.getPinnedMessages(conversationId, user.id)

        const response: ApiResponse = {
          success: true,
          data: { messages },
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapConversationReadError(error, 'Failed to get pinned messages')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  conversation.post(
    '/:conversationId/pin',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')

        const data = await service.pinConversation(conversationId, user.id)

        const response: ApiResponse = {
          success: true,
          data,
        }
        return c.json(response, 200)
      } catch (error) {
        return c.json(errorResponse(error, 'Failed to pin conversation'), 500)
      }
    }
  )

  conversation.delete(
    '/:conversationId/pin',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')

        const data = await service.unpinConversation(conversationId, user.id)

        const response: ApiResponse = {
          success: true,
          data,
        }
        return c.json(response, 200)
      } catch (error) {
        return c.json(errorResponse(error, 'Failed to unpin conversation'), 500)
      }
    }
  )

  conversation.get(
    '/:conversationId/participants',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')
        const participants = await service.getConversationParticipants(conversationId, user.id)
        const response: ApiResponse = { success: true, data: { participants } }
        return c.json(response, 200)
      } catch (error) {
        if (error instanceof ConversationAccessDeniedError) {
          const response: ApiResponse = createApiErrorResponse(ErrorCode.FORBIDDEN, 'Forbidden')
          return c.json(response, 403)
        }
        return c.json(errorResponse(error, 'Failed to get participants'), 500)
      }
    }
  )

  return conversation
}

export default createConversationRoutes()
