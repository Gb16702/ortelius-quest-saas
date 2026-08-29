import { randomUUID } from 'node:crypto'
import { zValidator } from '@hono/zod-validator'
import { Hono, type MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  assistantRateLimiter,
  type RateLimitResult,
} from '../../../infrastructure/monitoring/rate-limiter.service'
import {
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import type {
  AssistantAccessCheckResult,
  AssistantAccessPolicyPort,
} from '../application/assistant-access-policy'
import {
  type AssistantActionResult,
  AssistantActionService,
} from '../application/assistant-actions'
import {
  type AssistantConversationTitleGenerator,
  DEFAULT_ASSISTANT_CONVERSATION_TITLE,
} from '../application/assistant-conversation-title'
import type {
  AssistantAction,
  AssistantAttachment,
  AssistantConversation,
  AssistantMessage,
} from '../application/assistant-models'
import { createAssistantSyncAvailableMessage } from '../application/assistant-realtime-events'
import type { AssistantRealtimeNotifierPort, AssistantRepositoryPort } from '../application/ports'
import { assistantAccessPolicy } from '../infrastructure/assistant-access-policy.service'
import {
  ASSISTANT_ATTACHMENT_MAX_FILES,
  uploadAssistantAttachments,
} from '../infrastructure/assistant-attachments.service'
import { assistantRealtimeNotifier } from '../infrastructure/assistant-realtime-notifier.adapter'
import {
  type AssistantRunCancellationRegistryPort,
  assistantRunCancellationRegistry,
} from '../infrastructure/assistant-run-cancellation'
import {
  type AssistantRunQueuePort,
  assistantRunQueue,
} from '../infrastructure/assistant-run-queue'
import { assistantRepository } from '../infrastructure/drizzle-assistant.repository'
import { assistantConversationTitleGenerator } from '../infrastructure/openai-assistant-conversation-title-generator'
import {
  assistantActionParamSchema,
  assistantAttachmentQuerySchema,
  assistantConversationParamSchema,
  assistantMessageRequestSchema,
  assistantRecentAttachmentQuerySchema,
  assistantRunParamSchema,
  assistantSyncQuerySchema,
} from './assistant.schemas'

export interface AssistantRateLimiter {
  checkLimit(identifier: string): Promise<RateLimitResult>
}

type AssistantAuthMiddleware = MiddlewareHandler<{ Variables: CommonVariables }>
const assistantCommandMetadataSchema = z.object({
  version: z.literal(1),
  userMessageId: z.string().min(1),
  assistantMessageId: z.string().min(1),
  runId: z.string().min(1),
  body: assistantMessageRequestSchema,
  createdAt: z.string(),
})

type AssistantCommandMetadata = z.infer<typeof assistantCommandMetadataSchema>
const clientConversationIdSchema = z.string().uuid()

function buildAssistantAccessError(access: AssistantAccessCheckResult) {
  if (access.allowed) return null

  return {
    response: createApiErrorResponse(
      access.status === 402 ? ErrorCode.PAYMENT_REQUIRED : ErrorCode.FORBIDDEN,
      access.message,
      {
        reason: access.reason,
        ...access.details,
      }
    ),
    status: access.status,
  }
}

function buildAssistantActionError(result: Exclude<AssistantActionResult, { ok: true }>) {
  const errorCodeByActionCode = {
    BAD_REQUEST: ErrorCode.BAD_REQUEST,
    FORBIDDEN: ErrorCode.FORBIDDEN,
    NOT_FOUND: ErrorCode.NOT_FOUND,
    CONFLICT: ErrorCode.CONFLICT,
  } as const

  return createApiErrorResponse(errorCodeByActionCode[result.code], result.message, result.details)
}

function getAssistantCommandMetadata(message: AssistantMessage): AssistantCommandMetadata | null {
  if (!message.metadata || typeof message.metadata !== 'object') return null

  const parsed = assistantCommandMetadataSchema.safeParse(message.metadata.assistantCommand)
  return parsed.success ? parsed.data : null
}

function parseAssistantAttachmentFiles(body: Record<string, unknown>): File[] {
  const files: File[] = []
  const directFile = body.file

  if (directFile instanceof File) {
    files.push(directFile)
  }

  if (Array.isArray(directFile)) {
    files.push(...directFile.filter((file): file is File => file instanceof File))
  }

  for (let i = 0; i < ASSISTANT_ATTACHMENT_MAX_FILES * 2; i++) {
    const file = body[`file${i}`]
    if (file instanceof File) {
      files.push(file)
    }
  }

  return files
}

function parseOptionalFormString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function attachmentIdsEqual(left: string[] = [], right: string[] = []): boolean {
  if (left.length !== right.length) return false

  return left.every((id, index) => id === right[index])
}

function serializeAssistantAttachmentMetadata(attachment: AssistantAttachment) {
  return {
    id: attachment.id,
    userId: attachment.userId,
    organizationId: attachment.organizationId,
    conversationId: attachment.conversationId,
    messageId: attachment.messageId,
    filename: attachment.filename,
    originalName: attachment.originalName,
    size: attachment.size,
    mimeType: attachment.mimeType,
    s3Key: attachment.s3Key,
    url: attachment.url,
    downloadUrl: attachment.downloadUrl,
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  }
}

function buildAssistantTitleSeed(input: {
  message: string
  attachments: AssistantAttachment[]
}): string {
  const message = input.message.trim()
  if (message.length > 0) return message

  const attachmentNames = input.attachments
    .map((attachment) => attachment.originalName)
    .filter(Boolean)
    .join(', ')

  return attachmentNames ? `Uploaded files: ${attachmentNames}` : 'Uploaded files'
}

function isAssistantAttachmentValidationMessage(message: string): boolean {
  return (
    message.startsWith('File size exceeds') ||
    message.startsWith('Invalid file type') ||
    message.startsWith('Invalid file extension') ||
    message === 'At least one file is required' ||
    message === 'File validation failed' ||
    message === 'Maximum 5 files allowed per message'
  )
}

function mapAssistantAttachmentRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to process assistant attachments'

  if (message === 'Invalid assistant attachment cursor') {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, message),
    } as const
  }

  if (isAssistantAttachmentValidationMessage(message)) {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, message),
    } as const
  }

  return {
    status: 500,
    response: createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to process attachments'
    ),
  } as const
}

async function resolveAssistantMessageReplay(input: {
  body: z.infer<typeof assistantMessageRequestSchema>
  replayedMessage: {
    message: AssistantMessage
    conversation: AssistantConversation
  }
  repository: AssistantRepositoryPort
  runQueue: AssistantRunQueuePort
  user: NonNullable<CommonVariables['user']>
}): Promise<
  | {
      ok: true
      data: {
        conversationId: string
        userMessageId: string
        assistantMessageId: string
        runId: string
        lastSyncId: number
      }
    }
  | {
      ok: false
      message: string
      details?: Record<string, unknown>
    }
> {
  const { body, replayedMessage } = input

  if (replayedMessage.message.role !== 'user') {
    return {
      ok: false,
      message: 'Assistant message id was already used by a non-user message',
    }
  }

  if (body.conversationId && body.conversationId !== replayedMessage.conversation.id) {
    return {
      ok: false,
      message: 'Assistant message id belongs to a different conversation',
      details: {
        conversationId: replayedMessage.conversation.id,
      },
    }
  }

  if (replayedMessage.message.content !== body.message) {
    return {
      ok: false,
      message: 'Assistant message id was already used with different content',
    }
  }

  const command = getAssistantCommandMetadata(replayedMessage.message)
  if (!command) {
    return {
      ok: false,
      message: 'Assistant message id was already used before command metadata existed',
    }
  }

  if (body.assistantMessageId && body.assistantMessageId !== command.assistantMessageId) {
    return {
      ok: false,
      message: 'Assistant message id replay does not match the original assistant response id',
      details: {
        assistantMessageId: command.assistantMessageId,
      },
    }
  }

  if (!attachmentIdsEqual(body.attachmentIds, command.body.attachmentIds)) {
    return {
      ok: false,
      message: 'Assistant message id was already used with different attachments',
    }
  }

  if (
    (body.context?.organizationId ?? null) !== (command.body.context?.organizationId ?? null) ||
    (body.context?.routePath ?? null) !== (command.body.context?.routePath ?? null)
  ) {
    return {
      ok: false,
      message: 'Assistant message id was already used with different context',
    }
  }

  const completedAssistantMessage = await input.repository.findMessageWithConversationForUser(
    command.assistantMessageId,
    input.user.id
  )

  if (
    completedAssistantMessage &&
    (completedAssistantMessage.message.role !== 'assistant' ||
      completedAssistantMessage.conversation.id !== replayedMessage.conversation.id)
  ) {
    return {
      ok: false,
      message: 'Assistant response id belongs to a different message',
    }
  }

  if (!completedAssistantMessage) {
    await input.runQueue.enqueue({
      id: command.assistantMessageId,
      body: command.body,
      conversationId: replayedMessage.conversation.id,
      partId: command.assistantMessageId,
      runId: command.runId,
      user: input.user,
      createdAt: command.createdAt,
    })
  }

  return {
    ok: true,
    data: {
      conversationId: replayedMessage.conversation.id,
      userMessageId: command.userMessageId,
      assistantMessageId: command.assistantMessageId,
      runId: command.runId,
      lastSyncId: await input.repository.getLastSyncIdForUser(input.user.id),
    },
  }
}

export function createAssistantRoutes(
  rateLimiter: AssistantRateLimiter = assistantRateLimiter,
  authMiddleware: AssistantAuthMiddleware = requireAuthMiddleware,
  repository: AssistantRepositoryPort = assistantRepository,
  accessPolicy: AssistantAccessPolicyPort = assistantAccessPolicy,
  titleGenerator: AssistantConversationTitleGenerator = assistantConversationTitleGenerator,
  realtimeNotifier: AssistantRealtimeNotifierPort = assistantRealtimeNotifier,
  runQueue: AssistantRunQueuePort = assistantRunQueue,
  runCancellationRegistry: AssistantRunCancellationRegistryPort = assistantRunCancellationRegistry
) {
  const assistantRoutes = new Hono<{ Variables: CommonVariables }>()
  const actionService = new AssistantActionService(repository)

  assistantRoutes.get(
    '/sync',
    authMiddleware,
    zValidator('query', assistantSyncQuerySchema),
    async (c) => {
      const user = c.get('user')!
      const { after, limit } = c.req.valid('query')
      const result = await repository.listSyncActionsForUser({
        userId: user.id,
        after,
        limit,
      })

      return c.json({
        success: true,
        data: result,
      })
    }
  )

  const deleteAssistantConversation = async (input: {
    conversationId: string
    userId: string
  }): Promise<'deleted' | 'not_found'> => {
    const result = await repository.softDeleteConversationForUser({
      conversationId: input.conversationId,
      userId: input.userId,
    })

    if (!result) {
      return 'not_found'
    }

    if (!result.alreadyDeleted) {
      await publishAssistantConversationDeletedEvent({
        conversation: result.conversation,
        realtimeNotifier,
        repository,
        userId: input.userId,
      })
    }

    return 'deleted'
  }

  assistantRoutes.delete(
    '/conversations/:conversationId',
    authMiddleware,
    zValidator('param', assistantConversationParamSchema),
    async (c) => {
      const user = c.get('user')!
      const { conversationId } = c.req.valid('param')
      const result = await deleteAssistantConversation({ conversationId, userId: user.id })

      if (result === 'not_found') {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Conversation not found'), 404)
      }

      return c.body(null, 204)
    }
  )

  assistantRoutes.post(
    '/conversations/:conversationId/delete',
    authMiddleware,
    zValidator('param', assistantConversationParamSchema),
    async (c) => {
      const user = c.get('user')!
      const { conversationId } = c.req.valid('param')
      const result = await deleteAssistantConversation({ conversationId, userId: user.id })

      if (result === 'not_found') {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Conversation not found'), 404)
      }

      return c.body(null, 204)
    }
  )

  assistantRoutes.get(
    '/actions/:actionId',
    authMiddleware,
    zValidator('param', assistantActionParamSchema),
    async (c) => {
      const user = c.get('user')!
      const { actionId } = c.req.valid('param')
      const action = await repository.findActionForUser(actionId, user.id)

      if (!action) {
        return c.json(
          createApiErrorResponse(ErrorCode.NOT_FOUND, 'Assistant action not found'),
          404
        )
      }

      return c.json({ success: true, data: { action } })
    }
  )

  assistantRoutes.post(
    '/actions/:actionId/confirm',
    authMiddleware,
    zValidator('param', assistantActionParamSchema),
    async (c) => {
      const user = c.get('user')!
      const { actionId } = c.req.valid('param')
      const result = await actionService.confirmAction({ actionId, userId: user.id })

      if (!result.ok) {
        return c.json(buildAssistantActionError(result), result.status)
      }

      await publishAssistantActionUpdatedEvent({
        action: result.action,
        realtimeNotifier,
        repository,
        userId: user.id,
      })

      return c.json({ success: true, data: { action: result.action } })
    }
  )

  assistantRoutes.post(
    '/actions/:actionId/cancel',
    authMiddleware,
    zValidator('param', assistantActionParamSchema),
    async (c) => {
      const user = c.get('user')!
      const { actionId } = c.req.valid('param')
      const result = await actionService.cancelAction({ actionId, userId: user.id })

      if (!result.ok) {
        return c.json(buildAssistantActionError(result), result.status)
      }

      await publishAssistantActionUpdatedEvent({
        action: result.action,
        realtimeNotifier,
        repository,
        userId: user.id,
      })

      return c.json({ success: true, data: { action: result.action } })
    }
  )

  assistantRoutes.post(
    '/runs/:runId/cancel',
    authMiddleware,
    zValidator('param', assistantRunParamSchema),
    async (c) => {
      const user = c.get('user')!
      const { runId } = c.req.valid('param')
      const activeResult = runCancellationRegistry.cancelRun({ runId, userId: user.id })
      const result =
        activeResult.status === 'not_found'
          ? await runQueue.cancelRun({ runId, userId: user.id })
          : activeResult

      if (result.status === 'forbidden') {
        return c.json(createApiErrorResponse(ErrorCode.FORBIDDEN, 'Forbidden assistant run'), 403)
      }

      if (result.status === 'not_found') {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Assistant run not found'), 404)
      }

      if (result.source === 'pending') {
        await publishAssistantRunCancelledEvent({
          conversationId: result.conversationId,
          realtimeNotifier,
          repository,
          runId: result.runId,
          userId: user.id,
        })
      }

      return c.json({
        success: true,
        data: {
          conversationId: result.conversationId,
          runId: result.runId,
          status: result.status,
        },
      })
    }
  )

  assistantRoutes.post('/attachments', authMiddleware, async (c) => {
    try {
      const user = c.get('user')!
      const body = await c.req.parseBody()
      const files = parseAssistantAttachmentFiles(body)
      const organizationId = parseOptionalFormString(body.organizationId)

      if (
        organizationId &&
        !(await repository.userCanAccessOrganization(user.id, organizationId))
      ) {
        return c.json(
          createApiErrorResponse(ErrorCode.FORBIDDEN, 'Insufficient organization permissions'),
          403
        )
      }

      const attachments = await uploadAssistantAttachments({
        userId: user.id,
        organizationId,
        files,
        repository,
      })

      return c.json(
        {
          success: true,
          data: { attachments },
          message: 'Attachments uploaded successfully',
        },
        201
      )
    } catch (error) {
      const mapped = mapAssistantAttachmentRouteError(error)
      return c.json(mapped.response, mapped.status)
    }
  })

  assistantRoutes.get(
    '/attachments/recent',
    authMiddleware,
    zValidator('query', assistantRecentAttachmentQuerySchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { limit } = c.req.valid('query')
        const attachments = await repository.listRecentAttachmentsForUser({
          userId: user.id,
          limit,
        })

        return c.json({
          success: true,
          data: { attachments },
        })
      } catch (error) {
        const mapped = mapAssistantAttachmentRouteError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  assistantRoutes.get(
    '/attachments',
    authMiddleware,
    zValidator('query', assistantAttachmentQuerySchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { cursor, limit, search } = c.req.valid('query')
        const result = await repository.listAttachmentsForUser({
          userId: user.id,
          limit,
          cursor,
          search,
        })

        return c.json({
          success: true,
          data: {
            attachments: result.attachments,
            pagination: {
              limit,
              nextCursor: result.nextCursor,
              hasMore: result.nextCursor !== null,
            },
          },
        })
      } catch (error) {
        const mapped = mapAssistantAttachmentRouteError(error)
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  assistantRoutes.post(
    '/messages',
    authMiddleware,
    zValidator('json', assistantMessageRequestSchema),
    async (c) => {
      const user = c.get('user')!
      const rateLimit = await rateLimiter.checkLimit(user.id)

      if (!rateLimit.allowed) {
        if (rateLimit.retryAfter) {
          c.header('Retry-After', String(rateLimit.retryAfter))
        }

        return c.json(
          createApiErrorResponse(ErrorCode.RATE_LIMITED, 'Assistant rate limit exceeded', {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            resetTime: rateLimit.resetTime,
            retryAfter: rateLimit.retryAfter,
          }),
          429
        )
      }

      try {
        const body = c.req.valid('json')
        const replayedMessage = body.userMessageId
          ? await repository.findMessageWithConversationForUser(body.userMessageId, user.id)
          : null

        if (replayedMessage) {
          const replay = await resolveAssistantMessageReplay({
            body,
            replayedMessage,
            repository,
            runQueue,
            user,
          })

          if (!replay.ok) {
            return c.json(
              createApiErrorResponse(ErrorCode.CONFLICT, replay.message, replay.details),
              409
            )
          }

          return c.json(
            {
              success: true,
              data: replay.data,
            },
            202
          )
        }

        if (
          body.context?.organizationId &&
          !(await repository.userCanAccessOrganization(user.id, body.context.organizationId))
        ) {
          return c.json(
            createApiErrorResponse(ErrorCode.FORBIDDEN, 'Insufficient organization permissions'),
            403
          )
        }

        const existingConversation = body.conversationId
          ? await repository.findConversationForUser(body.conversationId, user.id)
          : null

        if (
          body.conversationId &&
          !existingConversation &&
          !clientConversationIdSchema.safeParse(body.conversationId).success
        ) {
          return c.json(
            createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Conversation id must be a UUID'),
            400
          )
        }

        const effectiveOrganizationId =
          body.context?.organizationId ?? existingConversation?.organizationId ?? null
        const access = await accessPolicy.checkAccess({
          userId: user.id,
          organizationId: effectiveOrganizationId,
        })
        const accessError = buildAssistantAccessError(access)

        if (accessError) {
          return c.json(accessError.response, accessError.status)
        }

        const isNewConversation = !existingConversation
        const conversation =
          existingConversation ??
          (await repository.createConversation({
            ...(body.conversationId ? { id: body.conversationId } : {}),
            userId: user.id,
            organizationId: effectiveOrganizationId ?? undefined,
            title: DEFAULT_ASSISTANT_CONVERSATION_TITLE,
            lastRoutePath: body.context?.routePath,
          }))
        const runId = randomUUID()
        const userMessageId = body.userMessageId ?? randomUUID()
        const assistantMessageId = body.assistantMessageId ?? randomUUID()
        const commandCreatedAt = new Date().toISOString()
        const attachments =
          body.attachmentIds.length > 0
            ? await repository.findAttachmentsForUser({
                userId: user.id,
                attachmentIds: body.attachmentIds,
              })
            : []

        if (attachments.length !== body.attachmentIds.length) {
          return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Attachment not found'), 404)
        }

        if (isNewConversation) {
          await publishAssistantConversationCreatedEvent({
            conversation,
            realtimeNotifier,
            repository,
            userId: user.id,
          })
          void generatePersistAndPublishConversationTitle({
            conversationId: conversation.id,
            userMessage: buildAssistantTitleSeed({
              message: body.message,
              attachments,
            }),
            repository,
            titleGenerator,
            realtimeNotifier,
          })
        }

        const commandBody = {
          ...body,
          conversationId: conversation.id,
          userMessageId,
          assistantMessageId,
        }
        const assistantCommand: AssistantCommandMetadata = {
          version: 1,
          userMessageId,
          assistantMessageId,
          runId,
          body: commandBody,
          createdAt: commandCreatedAt,
        }

        const userMessage = await repository.createMessage({
          id: userMessageId,
          conversationId: conversation.id,
          role: 'user',
          content: body.message,
          metadata: {
            routePath: body.context?.routePath,
            organizationId: body.context?.organizationId,
            ...(body.attachmentIds.length > 0
              ? {
                  attachmentIds: body.attachmentIds,
                  attachments: attachments.map(serializeAssistantAttachmentMetadata),
                }
              : {}),
            assistantCommand,
          },
        })

        if (body.attachmentIds.length > 0) {
          await repository.attachAttachmentsToMessage({
            userId: user.id,
            attachmentIds: body.attachmentIds,
            conversationId: conversation.id,
            messageId: userMessage.id,
          })
        }

        await notifyAssistantSyncAvailable(
          {
            realtimeNotifier,
            repository,
            userId: user.id,
          },
          'Failed to publish assistant user message sync'
        )

        await runQueue.enqueue({
          id: assistantMessageId,
          body: commandBody,
          conversationId: conversation.id,
          partId: assistantMessageId,
          runId,
          user,
          createdAt: commandCreatedAt,
        })
        const lastSyncId = await repository.getLastSyncIdForUser(user.id)

        return c.json(
          {
            success: true,
            data: {
              conversationId: conversation.id,
              userMessageId: userMessage.id,
              assistantMessageId,
              runId,
              lastSyncId,
            },
          },
          202
        )
      } catch (error) {
        console.error('Failed to accept assistant message:', error)
        return c.json(
          createApiErrorResponse(
            ErrorCode.UPSTREAM_UNAVAILABLE,
            'Assistant is temporarily unavailable'
          ),
          503
        )
      }
    }
  )

  return assistantRoutes
}

export default createAssistantRoutes()

async function publishAssistantConversationCreatedEvent(input: {
  conversation: AssistantConversation
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  userId: string
}): Promise<void> {
  await notifyAssistantSyncAvailable(input, 'Failed to publish assistant conversation creation')
}

async function publishAssistantRunCancelledEvent(input: {
  conversationId: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  userId: string
}) {
  const conversation = await input.repository.findConversationForUser(
    input.conversationId,
    input.userId
  )
  if (!conversation) return

  const syncAction = await input.repository.createSyncAction({
    userId: input.userId,
    organizationId: conversation.organizationId,
    conversationId: conversation.id,
    modelName: 'assistant_run',
    modelId: input.runId,
    operation: 'update',
    payload: {
      type: 'run_failed',
      message: 'Assistant generation stopped',
      code: 'run_cancelled',
    },
  })

  await notifyAssistantSyncAvailable(
    {
      realtimeNotifier: input.realtimeNotifier,
      repository: input.repository,
      userId: input.userId,
      latestSyncId: syncAction.syncId,
    },
    'Failed to publish assistant run cancellation'
  )
}

async function publishAssistantActionUpdatedEvent(input: {
  action: AssistantAction
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  userId: string
}): Promise<void> {
  const conversationId = input.action.conversationId
  if (!conversationId) return

  await notifyAssistantSyncAvailable(input, 'Failed to publish assistant action update')
}

async function publishAssistantConversationDeletedEvent(input: {
  conversation: AssistantConversation
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  userId: string
}): Promise<void> {
  await notifyAssistantSyncAvailable(input, 'Failed to publish assistant conversation deletion')
}

async function generatePersistAndPublishConversationTitle(input: {
  conversationId: string
  userMessage: string
  repository: AssistantRepositoryPort
  titleGenerator: AssistantConversationTitleGenerator
  realtimeNotifier: AssistantRealtimeNotifierPort
}): Promise<void> {
  try {
    const title = await input.titleGenerator.generate({
      userMessage: input.userMessage,
    })

    if (!title) return

    const conversation = await input.repository.updateConversationTitle({
      conversationId: input.conversationId,
      title,
    })

    if (!conversation) return

    await notifyAssistantSyncAvailable(
      {
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: conversation.userId,
      },
      'Failed to publish assistant conversation title'
    )
  } catch (error) {
    console.error('Failed to generate assistant conversation title:', error)
  }
}

async function notifyAssistantSyncAvailable(
  input: {
    realtimeNotifier: AssistantRealtimeNotifierPort
    repository?: AssistantRepositoryPort
    userId: string
    latestSyncId?: number
  },
  errorMessage: string
): Promise<void> {
  try {
    const latestSyncId =
      input.latestSyncId ?? (await input.repository?.getLastSyncIdForUser(input.userId))
    if (!latestSyncId) return

    await input.realtimeNotifier.notifyUser(
      input.userId,
      createAssistantSyncAvailableMessage({
        latestSyncId,
      })
    )
  } catch (error) {
    console.error(errorMessage, error)
  }
}
