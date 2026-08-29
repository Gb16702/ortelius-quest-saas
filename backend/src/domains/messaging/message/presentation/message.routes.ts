import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../../infrastructure/validation/validation.utils'
import type { Attachment } from '../../domain/messaging.types'
import {
  addReactionSchema,
  conversationIdParamSchema,
  editMessageSchema,
  emojiParamSchema,
  messageIdParamSchema,
  sendMessageSchema,
} from '../../presentation/messaging.schemas'
import { type MessageApplicationService, messageApplicationService } from '../message.application'

type MessageRouteService = Pick<
  MessageApplicationService,
  | 'canAccessConversation'
  | 'uploadAttachments'
  | 'sendMessage'
  | 'addReaction'
  | 'removeReaction'
  | 'deleteMessage'
  | 'editMessage'
  | 'pinMessage'
  | 'unpinMessage'
>

function parseAttachmentFiles(body: Record<string, unknown>): File[] {
  const files: File[] = []
  for (let i = 0; i < 10; i++) {
    const file = body[`file${i}`]
    if (file instanceof File) {
      files.push(file)
    }
  }
  return files
}

const messageNotFoundMessages = new Set(['Message not found', 'Reply target message not found'])

const messageForbiddenMessages = new Set([
  'Only the message author can unpin this message',
  'Only the message author or an admin/owner can unpin this message',
  'Only the message sender can delete this message',
  'Only the message sender can edit this message',
  'Unauthorized access to this conversation',
  'User not authorized to delete messages in this conversation',
  'User not authorized to edit messages in this conversation',
  'User not authorized to pin messages in this conversation',
  'User not authorized to send messages in this conversation',
  'User not authorized to unpin messages in this conversation',
  'You are not a participant of this conversation',
])

const messageBadRequestMessages = new Set([
  'Cannot edit a deleted message',
  'Cannot pin a deleted message',
  'Cannot pin system messages',
  'Cannot reply to deleted messages',
  'Cannot reply to system messages',
  'Maximum of 10 pinned messages per conversation',
  'Message already deleted',
  'Message is already pinned',
  'Message is not pinned',
  'Messages can only be deleted within 15 minutes of sending',
  'Messages can only be edited within 15 minutes of sending',
])

const attachmentBadRequestMessages = new Set([
  'At least one file is required',
  'File validation failed',
  'Maximum 5 files allowed per message',
])

function isAttachmentValidationMessage(message: string): boolean {
  return (
    attachmentBadRequestMessages.has(message) ||
    message.startsWith('File size exceeds ') ||
    message.startsWith('Invalid file type.') ||
    message.startsWith('Invalid file extension.')
  )
}

function mapMessageRouteError(
  error: unknown,
  fallback: string
): {
  status: 400 | 403 | 404 | 500
  response: ApiResponse
} {
  const message = error instanceof Error ? error.message : ''

  if (message === 'Forbidden' || messageForbiddenMessages.has(message)) {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, message || 'Forbidden'),
    }
  }

  if (messageNotFoundMessages.has(message)) {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, message),
    }
  }

  if (messageBadRequestMessages.has(message) || isAttachmentValidationMessage(message)) {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, message),
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback),
  }
}

export function createMessageRoutes(
  service: MessageRouteService = messageApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const message = new Hono<{ Variables: CommonVariables }>()

  message.post(
    '/:conversationId/attachments',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')
        const body = await c.req.parseBody()
        const files = parseAttachmentFiles(body)

        const attachments: Attachment[] = await service.uploadAttachments({
          conversationId,
          userId: user.id,
          files,
        })

        const response: ApiResponse = {
          success: true,
          data: { attachments },
          message: 'Attachments uploaded successfully',
        }
        return c.json(response, 201)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to upload attachments')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  message.post(
    '/:conversationId',
    authMiddleware,
    validateParam(conversationIdParamSchema),
    validateJson(sendMessageSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { conversationId } = c.req.valid('param')
        const { content, messageType, replyToId, metadata } = c.req.valid('json')

        const newMessage = await service.sendMessage({
          conversationId,
          senderId: user.id,
          content: content.trim(),
          messageType,
          replyToId,
          metadata,
        })

        const response: ApiResponse = {
          success: true,
          data: newMessage,
          message: 'Message sent successfully',
        }
        return c.json(response, 201)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to send message')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  message.post(
    '/:messageId/reactions',
    authMiddleware,
    validateParam(messageIdParamSchema),
    validateJson(addReactionSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { messageId } = c.req.valid('param')
        const { emoji } = c.req.valid('json')

        const reaction = await service.addReaction({ messageId, userId: user.id, emoji })

        const response: ApiResponse = {
          success: true,
          data: reaction,
          message: 'Reaction added successfully',
        }
        return c.json(response, 201)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to add reaction')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  message.delete(
    '/:messageId/reactions/:emoji',
    authMiddleware,
    validateParam(messageIdParamSchema),
    validateParam(emojiParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { messageId, emoji } = c.req.valid('param')
        const deletedReactions = await service.removeReaction(messageId, user.id, emoji)

        const response: ApiResponse = {
          success: true,
          data: deletedReactions,
          message: 'Reaction removed successfully',
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to remove reaction')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  message.delete('/:messageId', authMiddleware, validateParam(messageIdParamSchema), async (c) => {
    try {
      const user = c.get('user')!
      const { messageId } = c.req.valid('param')
      await service.deleteMessage(messageId, user.id)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Message deleted successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapMessageRouteError(error, 'Failed to delete message')
      return c.json(mapped.response, mapped.status)
    }
  })

  message.patch(
    '/:messageId',
    authMiddleware,
    validateParam(messageIdParamSchema),
    validateJson(editMessageSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { messageId } = c.req.valid('param')
        const { content } = c.req.valid('json')

        const updatedMessage = await service.editMessage(messageId, user.id, content.trim())

        const response: ApiResponse = {
          success: true,
          data: updatedMessage,
          message: 'Message updated successfully',
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to update message')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  message.post(
    '/:messageId/pin',
    authMiddleware,
    validateParam(messageIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { messageId } = c.req.valid('param')
        const pinnedMessage = await service.pinMessage(messageId, user.id)

        const response: ApiResponse = {
          success: true,
          data: pinnedMessage,
          message: 'Message pinned successfully',
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to pin message')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  message.delete(
    '/:messageId/pin',
    authMiddleware,
    validateParam(messageIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { messageId } = c.req.valid('param')
        const unpinnedMessage = await service.unpinMessage(messageId, user.id)

        const response: ApiResponse = {
          success: true,
          data: unpinnedMessage,
          message: 'Message unpinned successfully',
        }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapMessageRouteError(error, 'Failed to unpin message')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  return message
}

export default createMessageRoutes()
