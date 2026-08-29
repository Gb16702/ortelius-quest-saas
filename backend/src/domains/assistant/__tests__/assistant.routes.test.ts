import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono, type MiddlewareHandler } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { AssistantAccessPolicyPort } from '../application/assistant-access-policy'
import type { AssistantConversationCompactor } from '../application/assistant-conversation-compaction'
import type { AssistantConversationTitleGenerator } from '../application/assistant-conversation-title'
import type {
  AssistantAction,
  AssistantAttachment,
  AssistantConversation,
  AssistantMessage,
  AssistantSyncAction,
} from '../application/assistant-models'
import { serializeAssistantRealtimeAction } from '../application/assistant-realtime-events'
import type { AssistantRealtimeNotifierPort, AssistantRepositoryPort } from '../application/ports'
import type {
  AssistantAiService,
  AssistantStreamCallbacks,
} from '../infrastructure/assistant-ai.service'
import {
  type AssistantMessageRunJob,
  runAssistantMessageJob,
} from '../infrastructure/assistant-message-runner'
import {
  type AssistantRunCancellationRegistryPort,
  AssistantRunCancelledError,
} from '../infrastructure/assistant-run-cancellation'
import type { AssistantRunQueuePort } from '../infrastructure/assistant-run-queue'
import { type AssistantRateLimiter, createAssistantRoutes } from '../presentation/assistant.routes'

const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  role: 'member',
}

const assistantService = {
  runMessage: mock(() => Promise.resolve()),
} satisfies AssistantAiService

const rateLimiter = {
  checkLimit: mock(() =>
    Promise.resolve({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetTime: Date.now() + 60_000,
    })
  ),
} satisfies AssistantRateLimiter

const accessPolicy = {
  checkAccess: mock(() => Promise.resolve({ allowed: true as const })),
} satisfies AssistantAccessPolicyPort

const conversation: AssistantConversation = {
  id: 'conversation-1',
  userId: 'user-123',
  organizationId: 'org-123',
  title: 'Where can I update the organization tagline?',
  lastRoutePath: '/org/acme/settings/branding',
  summary: null,
  summaryMessageCount: 0,
  summaryTokenEstimate: 0,
  summaryUpdatedAt: null,
  deletedAt: null,
  createdAt: new Date('2026-06-10T10:00:00.000Z'),
  updatedAt: new Date('2026-06-10T10:00:00.000Z'),
}

const previousMessage: AssistantMessage = {
  id: 'message-previous',
  conversationId: 'conversation-1',
  role: 'assistant',
  content: 'You can update branding from organization settings.',
  metadata: null,
  createdAt: new Date('2026-06-10T10:01:00.000Z'),
}

const imageAttachment: AssistantAttachment = {
  id: '2a0d6f7d-7f1f-48a5-a1d9-7c60e2ea6a62',
  userId: 'user-123',
  organizationId: 'org-123',
  conversationId: null,
  messageId: null,
  filename: 'assistant-attachments/user-123/image.png',
  originalName: 'image.png',
  size: 1024,
  mimeType: 'image/png',
  s3Key: 'assistant-attachments/user-123/image.png',
  url: 'https://example.com/image.png',
  downloadUrl: 'https://example.com/image-download.png',
  createdAt: new Date('2026-06-10T10:01:00.000Z'),
  updatedAt: new Date('2026-06-10T10:01:00.000Z'),
}

const action: AssistantAction = {
  id: 'action-1',
  conversationId: 'conversation-1',
  userId: 'user-123',
  organizationId: 'org-123',
  type: 'open_page',
  status: 'proposed',
  title: 'Open branding settings',
  summary: 'Go to the page where organization brand details are managed.',
  buttonLabel: 'Open page',
  riskLevel: 'low',
  requiresConfirmation: true,
  payload: { routePath: '/org/acme/settings/branding' },
  preview: { routePath: '/org/acme/settings/branding' },
  result: null,
  errorMessage: null,
  expiresAt: new Date(Date.now() + 60_000),
  confirmedAt: null,
  executedAt: null,
  cancelledAt: null,
  createdAt: new Date('2026-06-10T10:03:00.000Z'),
  updatedAt: new Date('2026-06-10T10:03:00.000Z'),
}

let latestSyncId = 7

function createTestSyncAction(
  input: Parameters<AssistantRepositoryPort['createSyncAction']>[0]
): AssistantSyncAction {
  latestSyncId += 1

  return {
    syncId: latestSyncId,
    userId: input.userId,
    organizationId: input.organizationId ?? null,
    conversationId: input.conversationId,
    modelName: input.modelName,
    modelId: input.modelId,
    operation: input.operation,
    payload: input.payload,
    createdAt: new Date('2026-06-10T10:06:00.000Z'),
  }
}

const repository = {
  createConversation: mock(() => Promise.resolve(conversation)),
  findConversationForUser: mock(() => Promise.resolve(conversation)),
  countMessages: mock(() => Promise.resolve(1)),
  listMessagesAfterOffset: mock(() => Promise.resolve([previousMessage])),
  listMessages: mock(() => Promise.resolve([previousMessage])),
  findMessageWithConversationForUser: mock(() => Promise.resolve(null)),
  createMessage: mock((input) =>
    Promise.resolve({
      id: input.id ?? `message-${input.role}`,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? null,
      createdAt: new Date('2026-06-10T10:02:00.000Z'),
    })
  ),
  createAttachments: mock(() => Promise.resolve([imageAttachment])),
  findAttachmentsForUser: mock(() => Promise.resolve([imageAttachment])),
  listRecentAttachmentsForUser: mock(() => Promise.resolve([imageAttachment])),
  listAttachmentsForUser: mock(() =>
    Promise.resolve({
      attachments: [imageAttachment],
      nextCursor: null,
    })
  ),
  attachAttachmentsToMessage: mock(() => Promise.resolve([imageAttachment])),
  createAction: mock(() => Promise.resolve(action)),
  findActionForUser: mock(() => Promise.resolve(action)),
  updateAction: mock((input) =>
    Promise.resolve({
      ...action,
      status: input.status,
      result: input.result ?? action.result,
      errorMessage: input.errorMessage ?? action.errorMessage,
      confirmedAt: input.confirmedAt ?? action.confirmedAt,
      executedAt: input.executedAt ?? action.executedAt,
      cancelledAt: input.cancelledAt ?? action.cancelledAt,
      updatedAt: new Date('2026-06-10T10:04:00.000Z'),
    })
  ),
  userCanAccessOrganization: mock(() => Promise.resolve(true)),
  getOrganizationContextForUser: mock(() => Promise.resolve(null)),
  touchConversation: mock(() => Promise.resolve()),
  updateConversationSummary: mock(() => Promise.resolve(conversation)),
  updateConversationTitle: mock(() => Promise.resolve(conversation)),
  softDeleteConversationForUser: mock(() =>
    Promise.resolve({
      conversation: {
        ...conversation,
        deletedAt: new Date('2026-06-10T10:05:00.000Z'),
        updatedAt: new Date('2026-06-10T10:05:00.000Z'),
      },
      deletedAt: new Date('2026-06-10T10:05:00.000Z'),
      alreadyDeleted: false,
    })
  ),
  createSyncAction: mock((input) => Promise.resolve(createTestSyncAction(input))),
  getLastSyncIdForUser: mock(() => Promise.resolve(latestSyncId)),
  listSyncActionsForUser: mock(() =>
    Promise.resolve({
      firstSyncId: 1,
      lastSyncId: latestSyncId,
      hasMore: false,
      actions: [
        {
          syncId: latestSyncId,
          userId: 'user-123',
          organizationId: 'org-123',
          conversationId: 'conversation-1',
          modelName: 'assistant_conversation',
          modelId: 'conversation-1',
          operation: 'update',
          payload: {
            type: 'title_updated',
            conversationId: 'conversation-1',
            title: 'Trial status',
          },
          createdAt: new Date('2026-06-10T10:06:00.000Z'),
        },
      ],
    })
  ),
} satisfies AssistantRepositoryPort

const compactor = {
  compact: mock(() =>
    Promise.resolve({
      summary: 'The user asked about organization branding settings.',
      tokenEstimate: 12,
    })
  ),
} satisfies AssistantConversationCompactor

const titleGenerator = {
  generate: mock(() => Promise.resolve('Trial status')),
} satisfies AssistantConversationTitleGenerator

const realtimeNotifier = {
  notifyUser: mock(() => Promise.resolve()),
} satisfies AssistantRealtimeNotifierPort

const attachmentBinaryLoader = {
  loadAttachment: mock(() => Promise.resolve(Buffer.from('fake-image-binary'))),
}

const assistantRunQueue = {
  enqueue: mock((job: AssistantMessageRunJob) => {
    void runAssistantMessageJob({
      job,
      cancellationChecker: assistantRunQueue,
      compactor,
      realtimeNotifier,
      repository,
      service: assistantService,
      attachmentBinaryLoader,
    })

    return Promise.resolve()
  }),
  cancelRun: mock(() => Promise.resolve({ status: 'not_found' as const })),
  clearCancelledRun: mock(() => Promise.resolve()),
  isRunCancelled: mock(() => Promise.resolve(false)),
} satisfies AssistantRunQueuePort

const runCancellationRegistry = {
  register: mock(() => () => undefined),
  cancelRun: mock(() => ({
    status: 'cancelled' as const,
    conversationId: 'conversation-1',
    runId: 'run-1',
  })),
} satisfies AssistantRunCancellationRegistryPort

function createAuthMiddleware(
  authenticated: boolean
): MiddlewareHandler<{ Variables: CommonVariables }> {
  return async (c, next) => {
    if (!authenticated) {
      return c.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required' },
        401
      )
    }

    c.set('user', testUser)
    await next()
  }
}

function createApp(authenticated = true) {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route(
    '/assistant',
    createAssistantRoutes(
      rateLimiter,
      createAuthMiddleware(authenticated),
      repository,
      accessPolicy,
      titleGenerator,
      realtimeNotifier,
      assistantRunQueue,
      runCancellationRegistry
    )
  )
  return app
}

function postAssistantMessage(body: unknown, authenticated = true) {
  return createApp(authenticated).request('/assistant/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Assistant routes', () => {
  beforeEach(() => {
    latestSyncId = 7
    assistantService.runMessage.mockClear()
    compactor.compact.mockClear()
    titleGenerator.generate.mockClear()
    realtimeNotifier.notifyUser.mockClear()
    assistantRunQueue.enqueue.mockClear()
    assistantRunQueue.cancelRun.mockClear()
    assistantRunQueue.clearCancelledRun.mockClear()
    assistantRunQueue.isRunCancelled.mockClear()
    runCancellationRegistry.register.mockClear()
    runCancellationRegistry.cancelRun.mockClear()
    attachmentBinaryLoader.loadAttachment.mockClear()
    rateLimiter.checkLimit.mockClear()
    accessPolicy.checkAccess.mockClear()
    Object.values(repository).forEach((repositoryMock) => repositoryMock.mockClear())
    rateLimiter.checkLimit.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetTime: Date.now() + 60_000,
    })
    repository.createConversation.mockResolvedValue(conversation)
    repository.findConversationForUser.mockResolvedValue(conversation)
    repository.countMessages.mockResolvedValue(1)
    repository.listMessagesAfterOffset.mockResolvedValue([previousMessage])
    repository.listMessages.mockResolvedValue([previousMessage])
    repository.findMessageWithConversationForUser.mockResolvedValue(null)
    repository.createAttachments.mockResolvedValue([imageAttachment])
    repository.findAttachmentsForUser.mockResolvedValue([imageAttachment])
    repository.listRecentAttachmentsForUser.mockResolvedValue([imageAttachment])
    repository.listAttachmentsForUser.mockResolvedValue({
      attachments: [imageAttachment],
      nextCursor: null,
    })
    repository.attachAttachmentsToMessage.mockResolvedValue([imageAttachment])
    repository.createAction.mockResolvedValue(action)
    repository.findActionForUser.mockResolvedValue(action)
    repository.updateAction.mockImplementation((input) =>
      Promise.resolve({
        ...action,
        status: input.status,
        result: input.result ?? action.result,
        errorMessage: input.errorMessage ?? action.errorMessage,
        confirmedAt: input.confirmedAt ?? action.confirmedAt,
        executedAt: input.executedAt ?? action.executedAt,
        cancelledAt: input.cancelledAt ?? action.cancelledAt,
        updatedAt: new Date('2026-06-10T10:04:00.000Z'),
      })
    )
    repository.userCanAccessOrganization.mockResolvedValue(true)
    repository.getOrganizationContextForUser.mockResolvedValue(null)
    repository.createMessage.mockImplementation((input) =>
      Promise.resolve({
        id: input.id ?? `message-${input.role}`,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? null,
        createdAt: new Date('2026-06-10T10:02:00.000Z'),
      })
    )
    repository.touchConversation.mockResolvedValue(undefined)
    repository.updateConversationSummary.mockResolvedValue(conversation)
    repository.updateConversationTitle.mockResolvedValue(conversation)
    repository.softDeleteConversationForUser.mockResolvedValue({
      conversation: {
        ...conversation,
        deletedAt: new Date('2026-06-10T10:05:00.000Z'),
        updatedAt: new Date('2026-06-10T10:05:00.000Z'),
      },
      deletedAt: new Date('2026-06-10T10:05:00.000Z'),
      alreadyDeleted: false,
    })
    repository.createSyncAction.mockImplementation((input) =>
      Promise.resolve(createTestSyncAction(input))
    )
    repository.getLastSyncIdForUser.mockResolvedValue(latestSyncId)
    repository.listSyncActionsForUser.mockResolvedValue({
      firstSyncId: 1,
      lastSyncId: latestSyncId,
      hasMore: false,
      actions: [
        {
          syncId: latestSyncId,
          userId: 'user-123',
          organizationId: 'org-123',
          conversationId: 'conversation-1',
          modelName: 'assistant_conversation',
          modelId: 'conversation-1',
          operation: 'update',
          payload: {
            type: 'title_updated',
            conversationId: 'conversation-1',
            title: 'Trial status',
          },
          createdAt: new Date('2026-06-10T10:06:00.000Z'),
        },
      ],
    })
    compactor.compact.mockResolvedValue({
      summary: 'The user asked about organization branding settings.',
      tokenEstimate: 12,
    })
    titleGenerator.generate.mockResolvedValue('Trial status')
    accessPolicy.checkAccess.mockResolvedValue({ allowed: true })
    attachmentBinaryLoader.loadAttachment.mockResolvedValue(Buffer.from('fake-image-binary'))
    assistantRunQueue.cancelRun.mockResolvedValue({ status: 'not_found' })
    assistantRunQueue.clearCancelledRun.mockResolvedValue(undefined)
    assistantRunQueue.isRunCancelled.mockResolvedValue(false)
  })

  it('requires authentication', async () => {
    const response = await postAssistantMessage(
      { message: 'Where can I update my tagline?' },
      false
    )

    expect(response.status).toBe(401)
    expect(assistantService.runMessage).not.toHaveBeenCalled()
  })

  it('validates the message payload', async () => {
    const response = await postAssistantMessage({ message: '   ' })

    expect(response.status).toBe(400)
    expect(assistantService.runMessage).not.toHaveBeenCalled()
  })

  it('rate limits by authenticated user', async () => {
    rateLimiter.checkLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetTime: 1_767_200_000_000,
      retryAfter: 42,
    })

    const response = await postAssistantMessage({ message: 'Summarize my trial status.' })
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(json).toEqual({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Assistant rate limit exceeded',
      details: {
        limit: 10,
        remaining: 0,
        resetTime: 1_767_200_000_000,
        retryAfter: 42,
      },
    })
    expect(rateLimiter.checkLimit).toHaveBeenCalledWith('user-123')
    expect(assistantService.runMessage).not.toHaveBeenCalled()
    expect(repository.createMessage).not.toHaveBeenCalled()
  })

  it('runs assistant messages with user and page context', async () => {
    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
      assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
      message: 'Where can I update the organization tagline?',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })

    const json = await response.json()
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(json).toEqual({
      success: true,
      data: {
        conversationId: 'conversation-1',
        userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
        assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
        runId: expect.any(String),
        lastSyncId: expect.any(Number),
      },
    })
    expect(repository.userCanAccessOrganization).toHaveBeenCalledWith('user-123', 'org-123')
    expect(accessPolicy.checkAccess).toHaveBeenCalledWith({
      userId: 'user-123',
      organizationId: 'org-123',
    })
    expect(repository.findConversationForUser).toHaveBeenCalledWith('conversation-1', 'user-123')
    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        role: 'user',
        id: json.data.userMessageId,
        content: 'Where can I update the organization tagline?',
        metadata: expect.objectContaining({
          organizationId: 'org-123',
          routePath: '/org/acme/settings/branding',
          assistantCommand: expect.objectContaining({
            assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
            userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
          }),
        }),
      })
    )
    expect(assistantRunQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        body: expect.objectContaining({
          message: 'Where can I update the organization tagline?',
        }),
        runId: expect.any(String),
        partId: json.data.assistantMessageId,
      })
    )
    expect(repository.countMessages).toHaveBeenCalledWith('conversation-1')
    expect(repository.listMessagesAfterOffset).toHaveBeenCalledWith('conversation-1', 0, 1000)
    expect(assistantService.runMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
        assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
        message: 'Where can I update the organization tagline?',
        attachmentIds: [],
        context: {
          organizationId: 'org-123',
          routePath: '/org/acme/settings/branding',
        },
        user: testUser,
        messages: [
          {
            role: 'assistant',
            content: 'You can update branding from organization settings.',
          },
          {
            role: 'user',
            content: 'Where can I update the organization tagline?',
          },
        ],
      }),
      expect.any(Object)
    )
  })

  it('accepts assistant messages with attachments and links them to the user message', async () => {
    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
      assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
      message: 'What is in this image?',
      attachmentIds: [imageAttachment.id],
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    const json = await response.json()
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(json.data).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-1',
        userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
        assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
      })
    )
    expect(repository.findAttachmentsForUser).toHaveBeenCalledWith({
      userId: 'user-123',
      attachmentIds: [imageAttachment.id],
    })
    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '63516c47-1156-44db-b517-48682d1bd4b1',
        content: 'What is in this image?',
        metadata: expect.objectContaining({
          attachmentIds: [imageAttachment.id],
          attachments: [
            {
              id: imageAttachment.id,
              userId: imageAttachment.userId,
              organizationId: imageAttachment.organizationId,
              conversationId: imageAttachment.conversationId,
              messageId: imageAttachment.messageId,
              filename: imageAttachment.filename,
              originalName: 'image.png',
              size: imageAttachment.size,
              mimeType: 'image/png',
              s3Key: imageAttachment.s3Key,
              url: imageAttachment.url,
              downloadUrl: imageAttachment.downloadUrl,
              createdAt: imageAttachment.createdAt.toISOString(),
              updatedAt: imageAttachment.updatedAt.toISOString(),
            },
          ],
        }),
      })
    )
    expect(repository.attachAttachmentsToMessage).toHaveBeenCalledWith({
      userId: 'user-123',
      attachmentIds: [imageAttachment.id],
      conversationId: 'conversation-1',
      messageId: '63516c47-1156-44db-b517-48682d1bd4b1',
    })
    expect(attachmentBinaryLoader.loadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: imageAttachment.id,
        s3Key: imageAttachment.s3Key,
      })
    )
    expect(assistantRunQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          attachmentIds: [imageAttachment.id],
        }),
      })
    )
    expect(assistantService.runMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'image',
                source: expect.objectContaining({
                  type: 'data',
                  value: Buffer.from('fake-image-binary').toString('base64'),
                  mimeType: 'image/png',
                }),
              }),
            ]),
          }),
        ]),
      }),
      expect.any(Object)
    )
  })

  it('replays an accepted assistant command without creating another user message', async () => {
    const replayedUserMessage: AssistantMessage = {
      id: '63516c47-1156-44db-b517-48682d1bd4b1',
      conversationId: 'conversation-1',
      role: 'user',
      content: 'Where can I update the organization tagline?',
      metadata: {
        assistantCommand: {
          version: 1,
          userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
          assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
          runId: '4335033f-ece8-420f-a727-6d62a7c91df26',
          body: {
            conversationId: 'conversation-1',
            userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
            assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
            message: 'Where can I update the organization tagline?',
            context: {
              organizationId: 'org-123',
              routePath: '/org/acme/settings/branding',
            },
          },
          createdAt: '2026-06-10T10:02:00.000Z',
        },
      },
      createdAt: new Date('2026-06-10T10:02:00.000Z'),
    }
    repository.findMessageWithConversationForUser
      .mockResolvedValueOnce({
        message: replayedUserMessage,
        conversation,
      })
      .mockResolvedValueOnce(null)

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
      assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
      message: 'Where can I update the organization tagline?',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json).toEqual({
      success: true,
      data: {
        conversationId: 'conversation-1',
        userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
        assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
        runId: '4335033f-ece8-420f-a727-6d62a7c91df26',
        lastSyncId: expect.any(Number),
      },
    })
    expect(repository.createMessage).not.toHaveBeenCalled()
    expect(assistantRunQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
        partId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
        runId: '4335033f-ece8-420f-a727-6d62a7c91df26',
      })
    )
  })

  it('accepts assistant commands before the AI run completes', async () => {
    let resolveRun: (() => void) | null = null
    assistantService.runMessage.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRun = resolve
        })
    )

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Where can I update the organization tagline?',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    const json = await response.json()
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(json).toEqual({
      success: true,
      data: {
        conversationId: 'conversation-1',
        userMessageId: expect.any(String),
        assistantMessageId: expect.any(String),
        runId: expect.any(String),
        lastSyncId: expect.any(Number),
      },
    })
    expect(assistantService.runMessage).toHaveBeenCalled()

    resolveRun?.()
  })

  it('publishes action proposals through the shared websocket notifier', async () => {
    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Open branding settings.',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    await waitForBackgroundAssistantRun()
    const callbacks = assistantService.runMessage.mock.calls.at(-1)?.[1] as
      | AssistantStreamCallbacks
      | undefined

    await callbacks?.onCustomEvent?.({
      name: 'quest_assistant:action_proposed',
      value: {
        action: serializeAssistantRealtimeAction(action),
      },
    })

    expect(response.status).toBe(202)
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
        timestamp: expect.any(String),
      })
    )
  })

  it('publishes assistant statuses as safe reasoning parts through the websocket notifier', async () => {
    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Check my permissions.',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    await waitForBackgroundAssistantRun()
    const callbacks = assistantService.runMessage.mock.calls.at(-1)?.[1] as
      | AssistantStreamCallbacks
      | undefined

    await callbacks?.onCustomEvent?.({
      name: 'quest_assistant:status',
      value: {
        body: 'I am checking whether the current user can access branding settings.',
        label: 'Checking permissions',
      },
    })

    expect(response.status).toBe(202)
    expect(repository.createSyncAction).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'assistant_part',
        operation: 'insert',
        conversationId: 'conversation-1',
        organizationId: 'org-123',
        payload: expect.objectContaining({
          type: 'part_started',
          part: expect.objectContaining({
            type: 'reasoning',
            role: 'assistant',
            metadata: {
              label: 'Checking permissions',
            },
          }),
        }),
      })
    )
    expect(repository.createSyncAction).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'assistant_part',
        operation: 'update',
        conversationId: 'conversation-1',
        organizationId: 'org-123',
        payload: expect.objectContaining({
          type: 'part_completed',
          content: 'I am checking whether the current user can access branding settings.',
        }),
      })
    )
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('compacts older messages before running long conversations', async () => {
    const oversizedOldMessage: AssistantMessage = {
      ...previousMessage,
      id: 'message-oversized-old',
      role: 'user',
      content: 'Old context. '.repeat(25_000),
      createdAt: new Date('2026-06-10T09:00:00.000Z'),
    }
    repository.countMessages.mockResolvedValue(2)
    repository.listMessagesAfterOffset.mockResolvedValue([oversizedOldMessage, previousMessage])

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Continue with the latest branding question.',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(compactor.compact).toHaveBeenCalledWith({
      previousSummary: null,
      messages: [oversizedOldMessage],
    })
    expect(repository.updateConversationSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        summary: 'The user asked about organization branding settings.',
        summaryMessageCount: 1,
        summaryTokenEstimate: 12,
      })
    )
    expect(assistantService.runMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'assistant',
            content:
              'Conversation summary so far:\nThe user asked about organization branding settings.',
          },
          {
            role: 'assistant',
            content: 'You can update branding from organization settings.',
          },
          {
            role: 'user',
            content: 'Continue with the latest branding question.',
          },
        ],
      }),
      expect.any(Object)
    )
  })

  it('uses an existing conversation summary without compacting when the window fits', async () => {
    repository.findConversationForUser.mockResolvedValue({
      ...conversation,
      summary: 'The user is working on organization branding.',
      summaryMessageCount: 3,
      summaryTokenEstimate: 10,
      summaryUpdatedAt: new Date('2026-06-10T10:05:00.000Z'),
    })
    repository.countMessages.mockResolvedValue(4)
    repository.listMessagesAfterOffset.mockResolvedValue([previousMessage])

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'What page was that again?',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(compactor.compact).not.toHaveBeenCalled()
    expect(repository.listMessagesAfterOffset).toHaveBeenCalledWith('conversation-1', 3, 1000)
    expect(assistantService.runMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'assistant',
            content: 'Conversation summary so far:\nThe user is working on organization branding.',
          },
          {
            role: 'assistant',
            content: 'You can update branding from organization settings.',
          },
          {
            role: 'user',
            content: 'What page was that again?',
          },
        ],
      }),
      expect.any(Object)
    )
  })

  it('creates a conversation when no conversation id is provided', async () => {
    const response = await postAssistantMessage({
      message: 'How much time is left on my trial?',
      context: { organizationId: 'org-123', routePath: '/org/acme/billing' },
    })

    expect(response.status).toBe(202)
    expect(repository.createConversation).toHaveBeenCalledWith({
      userId: 'user-123',
      organizationId: 'org-123',
      title: 'New chat',
      lastRoutePath: '/org/acme/billing',
    })
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('persists the completed assistant response from the run callback', async () => {
    assistantService.runMessage.mockImplementationOnce(async (_input, callbacks) => {
      await callbacks?.onTextComplete?.('You can update it from branding settings.')
    })

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Where can I update the tagline?',
      context: { organizationId: 'org-123', routePath: '/org/acme/settings/branding' },
    })
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(repository.createMessage).toHaveBeenCalledWith({
      id: expect.any(String),
      conversationId: 'conversation-1',
      role: 'assistant',
      content: 'You can update it from branding settings.',
      metadata: {
        runId: expect.any(String),
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    })
    expect(repository.touchConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      lastRoutePath: '/org/acme/settings/branding',
    })
    expect(titleGenerator.generate).not.toHaveBeenCalled()
  })

  it('publishes text parts through the shared websocket notifier', async () => {
    assistantService.runMessage.mockImplementationOnce(async (_input, callbacks) => {
      await callbacks?.onTextDelta?.({
        delta: 'You can update it',
        content: 'You can update it',
      })
      await callbacks?.onTextDelta?.({
        delta: ' from branding settings.',
        content: 'You can update it from branding settings.',
      })
      await callbacks?.onTextComplete?.('You can update it from branding settings.')
    })

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Where can I update the tagline?',
      context: { organizationId: 'org-123', routePath: '/org/acme/settings/branding' },
    })
    await waitForBackgroundAssistantRun()

    const syncActions = repository.createSyncAction.mock.calls.map(([input]) => input)
    const partStarted = syncActions.find(
      (input) =>
        input.modelName === 'assistant_part' &&
        input.operation === 'insert' &&
        input.payload.type === 'part_started'
    )
    const partDeltas = syncActions.filter((input) => input.payload.type === 'part_delta')
    const partCompleted = syncActions.find((input) => input.payload.type === 'part_completed')
    const runCompleted = syncActions.find(
      (input) => input.modelName === 'assistant_run' && input.payload.type === 'run_completed'
    )

    expect(response.status).toBe(202)
    if (!partStarted || partStarted.payload.type !== 'part_started') {
      throw new Error('Expected assistant text part start event')
    }
    expect(partStarted).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-1',
        organizationId: 'org-123',
        payload: expect.objectContaining({
          type: 'part_started',
          part: expect.objectContaining({
            type: 'text',
            role: 'assistant',
            runId: expect.any(String),
          }),
        }),
      })
    )
    expect(partDeltas).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'part_delta',
          delta: 'You can update it from branding settings.',
          content: 'You can update it from branding settings.',
        }),
      }),
    ])
    expect(partCompleted).toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'part_completed',
          content: 'You can update it from branding settings.',
        }),
      })
    )
    expect(runCompleted).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-1',
        payload: expect.objectContaining({
          type: 'run_completed',
          messageId: expect.any(String),
        }),
      })
    )
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
    const liveDeltaEvents = realtimeNotifier.notifyUser.mock.calls
      .map(([, event]) => event)
      .filter((event) => event.type === 'assistant:live_delta')
    expect(liveDeltaEvents).toEqual([
      expect.objectContaining({
        delta: 'You can update it',
        content: 'You can update it',
      }),
      expect.objectContaining({
        delta: ' from branding settings.',
        content: 'You can update it from branding settings.',
      }),
    ])
  })

  it('publishes run completion without persisting an empty assistant message', async () => {
    assistantService.runMessage.mockImplementationOnce(async (_input, callbacks) => {
      await callbacks?.onTextComplete?.('   ')
    })

    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Open branding settings.',
      context: { organizationId: 'org-123', routePath: '/org/acme/settings/branding' },
    })
    await waitForBackgroundAssistantRun()

    const assistantMessageWrites = repository.createMessage.mock.calls.filter(
      ([input]) => input.role === 'assistant'
    )

    expect(response.status).toBe(202)
    expect(assistantMessageWrites).toEqual([])
    expect(repository.touchConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      lastRoutePath: '/org/acme/settings/branding',
    })
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('generates and publishes a short title when a new conversation starts', async () => {
    const response = await postAssistantMessage({
      message: 'How much time is left on my trial?',
      context: { organizationId: 'org-123', routePath: '/org/acme/billing' },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(response.status).toBe(202)
    expect(titleGenerator.generate).toHaveBeenCalledWith({
      userMessage: 'How much time is left on my trial?',
    })
    expect(repository.updateConversationTitle).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      title: 'Trial status',
    })
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
        timestamp: expect.any(String),
      })
    )
  })

  it('creates a conversation with a client-provided conversation id', async () => {
    const clientConversationId = '7e1b4b9d-69ea-44b0-9145-83f4df083846'
    const clientConversation = {
      ...conversation,
      id: clientConversationId,
    }
    repository.findConversationForUser.mockResolvedValue(null)
    repository.createConversation.mockResolvedValue(clientConversation)

    const response = await postAssistantMessage({
      conversationId: clientConversationId,
      message: 'Continue this chat.',
      context: { organizationId: 'org-123', routePath: '/org/acme/requests' },
    })
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json.data.conversationId).toBe(clientConversationId)
    expect(repository.findConversationForUser).toHaveBeenCalledWith(
      clientConversationId,
      'user-123'
    )
    expect(repository.createConversation).toHaveBeenCalledWith({
      id: clientConversationId,
      userId: 'user-123',
      organizationId: 'org-123',
      title: 'New chat',
      lastRoutePath: '/org/acme/requests',
    })
    expect(assistantRunQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: clientConversationId,
        body: expect.objectContaining({
          conversationId: clientConversationId,
        }),
      })
    )
  })

  it('rejects a non-UUID client-provided id for a new conversation', async () => {
    repository.findConversationForUser.mockResolvedValue(null)

    const response = await postAssistantMessage({
      conversationId: 'conversation-other',
      message: 'Start this chat.',
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Conversation id must be a UUID',
    })
    expect(repository.createConversation).not.toHaveBeenCalled()
    expect(assistantRunQueue.enqueue).not.toHaveBeenCalled()
  })

  it('uses the existing conversation organization for entitlement checks', async () => {
    const response = await postAssistantMessage({
      conversationId: 'conversation-1',
      message: 'Continue this chat.',
    })

    expect(response.status).toBe(202)
    expect(accessPolicy.checkAccess).toHaveBeenCalledWith({
      userId: 'user-123',
      organizationId: 'org-123',
    })
  })

  it('rejects organization context when the user is not a member', async () => {
    repository.userCanAccessOrganization.mockResolvedValue(false)

    const response = await postAssistantMessage({
      message: 'Summarize this organization.',
      context: { organizationId: 'org-forbidden' },
    })

    expect(response.status).toBe(403)
    expect(repository.createConversation).not.toHaveBeenCalled()
    expect(assistantService.runMessage).not.toHaveBeenCalled()
  })

  it('requires an eligible assistant plan before creating a new conversation', async () => {
    accessPolicy.checkAccess.mockResolvedValue({
      allowed: false,
      reason: 'PLAN_NOT_ALLOWED',
      message: 'Quest Assistant is available on Professional and Enterprise plans.',
      status: 402,
      details: {
        plan: 'starter',
        requiredPlans: ['professional', 'enterprise'],
      },
    })

    const response = await postAssistantMessage({
      message: 'Where can I update my tagline?',
      context: { organizationId: 'org-123' },
    })
    const json = await response.json()

    expect(response.status).toBe(402)
    expect(json).toEqual({
      success: false,
      code: 'PAYMENT_REQUIRED',
      message: 'Quest Assistant is available on Professional and Enterprise plans.',
      details: {
        reason: 'PLAN_NOT_ALLOWED',
        plan: 'starter',
        requiredPlans: ['professional', 'enterprise'],
      },
    })
    expect(repository.createConversation).not.toHaveBeenCalled()
    expect(assistantService.runMessage).not.toHaveBeenCalled()
  })

  it('can disable the assistant through the access policy', async () => {
    accessPolicy.checkAccess.mockResolvedValue({
      allowed: false,
      reason: 'FEATURE_DISABLED',
      message: 'Quest Assistant is not enabled for this environment.',
      status: 403,
    })

    const response = await postAssistantMessage({
      message: 'Hello',
      context: { organizationId: 'org-123' },
    })
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Quest Assistant is not enabled for this environment.',
      details: {
        reason: 'FEATURE_DISABLED',
      },
    })
    expect(repository.createConversation).not.toHaveBeenCalled()
    expect(assistantService.runMessage).not.toHaveBeenCalled()
  })

  it('returns durable assistant sync actions after the local cursor', async () => {
    const response = await createApp().request('/assistant/sync?after=3&limit=50')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(repository.listSyncActionsForUser).toHaveBeenCalledWith({
      userId: 'user-123',
      after: 3,
      limit: 50,
    })
    expect(json).toEqual({
      success: true,
      data: {
        firstSyncId: 1,
        lastSyncId: latestSyncId,
        hasMore: false,
        actions: [
          expect.objectContaining({
            syncId: latestSyncId,
            userId: 'user-123',
            conversationId: 'conversation-1',
            modelName: 'assistant_conversation',
            operation: 'update',
          }),
        ],
      },
    })
  })

  it('soft deletes a conversation and publishes the deletion event', async () => {
    const response = await createApp().request('/assistant/conversations/conversation-1', {
      method: 'DELETE',
    })

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(repository.softDeleteConversationForUser).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      userId: 'user-123',
    })
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('supports the assistant conversation delete command endpoint', async () => {
    const response = await createApp().request('/assistant/conversations/conversation-1/delete', {
      method: 'POST',
    })

    expect(response.status).toBe(204)
    expect(repository.softDeleteConversationForUser).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      userId: 'user-123',
    })
  })

  it('treats repeated conversation deletes as idempotent no-ops', async () => {
    repository.softDeleteConversationForUser.mockResolvedValue({
      conversation: {
        ...conversation,
        deletedAt: new Date('2026-06-10T10:05:00.000Z'),
        updatedAt: new Date('2026-06-10T10:05:00.000Z'),
      },
      deletedAt: new Date('2026-06-10T10:05:00.000Z'),
      alreadyDeleted: true,
    })

    const response = await createApp().request('/assistant/conversations/conversation-1', {
      method: 'DELETE',
    })

    expect(response.status).toBe(204)
    expect(realtimeNotifier.notifyUser).not.toHaveBeenCalled()
  })

  it('does not delete conversations that are unavailable to the user', async () => {
    repository.softDeleteConversationForUser.mockResolvedValue(null)

    const response = await createApp().request('/assistant/conversations/conversation-other', {
      method: 'DELETE',
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Conversation not found',
    })
    expect(realtimeNotifier.notifyUser).not.toHaveBeenCalled()
  })

  it('confirms an open page action through the action framework', async () => {
    const response = await createApp().request('/assistant/actions/action-1/confirm', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.action).toEqual(
      expect.objectContaining({
        id: 'action-1',
        status: 'executed',
        result: {
          type: 'open_page',
          routePath: '/org/acme/settings/branding',
        },
      })
    )
    expect(repository.findActionForUser).toHaveBeenCalledWith('action-1', 'user-123')
    expect(repository.userCanAccessOrganization).toHaveBeenCalledWith('user-123', 'org-123')
    expect(repository.updateAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'action-1',
        userId: 'user-123',
        status: 'executed',
        result: {
          type: 'open_page',
          routePath: '/org/acme/settings/branding',
        },
      })
    )
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('cancels a proposed action', async () => {
    const response = await createApp().request('/assistant/actions/action-1/cancel', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.action).toEqual(
      expect.objectContaining({
        id: 'action-1',
        status: 'cancelled',
      })
    )
    expect(repository.updateAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'action-1',
        userId: 'user-123',
        status: 'cancelled',
      })
    )
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('cancels an active assistant run', async () => {
    const response = await createApp().request('/assistant/runs/run-1/cancel', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: {
        conversationId: 'conversation-1',
        runId: 'run-1',
        status: 'cancelled',
      },
    })
    expect(runCancellationRegistry.cancelRun).toHaveBeenCalledWith({
      runId: 'run-1',
      userId: 'user-123',
    })
  })

  it('returns not found when cancelling an unknown assistant run', async () => {
    runCancellationRegistry.cancelRun.mockReturnValueOnce({ status: 'not_found' })
    assistantRunQueue.cancelRun.mockResolvedValueOnce({ status: 'not_found' })

    const response = await createApp().request('/assistant/runs/missing-run/cancel', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Assistant run not found',
    })
  })

  it('cancels a queued assistant run before the worker registers it as active', async () => {
    runCancellationRegistry.cancelRun.mockReturnValueOnce({ status: 'not_found' })
    assistantRunQueue.cancelRun.mockResolvedValueOnce({
      status: 'cancelled',
      conversationId: 'conversation-1',
      runId: 'run-queued',
      source: 'pending',
    })

    const response = await createApp().request('/assistant/runs/run-queued/cancel', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: {
        conversationId: 'conversation-1',
        runId: 'run-queued',
        status: 'cancelled',
      },
    })
    expect(assistantRunQueue.cancelRun).toHaveBeenCalledWith({
      runId: 'run-queued',
      userId: 'user-123',
    })
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('does not expose actions owned by another user', async () => {
    repository.findActionForUser.mockResolvedValueOnce(null)

    const response = await createApp().request('/assistant/actions/action-1')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Assistant action not found',
    })
  })

  it('stops a processing run when Redis marks it cancelled during streaming', async () => {
    assistantRunQueue.isRunCancelled
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true)
    assistantService.runMessage.mockImplementationOnce(async (_input, callbacks) => {
      await callbacks?.onTextDelta?.({
        delta: 'Partial answer',
        content: 'Partial answer',
      })
      await callbacks?.onTextDelta?.({
        delta: ' should not continue',
        content: 'Partial answer should not continue',
      })
      await callbacks?.onTextComplete?.('Partial answer should not continue')
    })

    const response = await postAssistantMessage({ message: 'Stop if cancelled' })
    await waitForBackgroundAssistantRun()

    const assistantMessageWrites = repository.createMessage.mock.calls.filter(
      ([input]) => input.role === 'assistant'
    )
    const runCompletedActions = repository.createSyncAction.mock.calls.filter(
      ([input]) => input.payload.type === 'run_completed'
    )

    expect(response.status).toBe(202)
    expect(assistantMessageWrites).toEqual([])
    expect(runCompletedActions).toEqual([])
    expect(repository.createSyncAction).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'assistant_run',
        operation: 'update',
        conversationId: 'conversation-1',
        payload: expect.objectContaining({
          type: 'run_failed',
          message: 'Assistant generation stopped',
          code: 'run_cancelled',
        }),
      })
    )
  })

  it('publishes a run failure when the detached assistant run fails', async () => {
    assistantService.runMessage.mockImplementationOnce(() => {
      throw new Error('OpenAI unavailable')
    })

    const response = await postAssistantMessage({ message: 'Hello' })
    const json = await response.json()
    await waitForBackgroundAssistantRun()

    expect(response.status).toBe(202)
    expect(json).toEqual({
      success: true,
      data: {
        conversationId: 'conversation-1',
        userMessageId: expect.any(String),
        assistantMessageId: expect.any(String),
        runId: expect.any(String),
        lastSyncId: expect.any(Number),
      },
    })
    expect(repository.createSyncAction).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'assistant_run',
        operation: 'update',
        conversationId: 'conversation-1',
        payload: expect.objectContaining({
          type: 'run_failed',
          message: 'Assistant stream failed',
          code: 'stream_error',
        }),
      })
    )
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })

  it('publishes a cancelled run failure without persisting an assistant response', async () => {
    assistantService.runMessage.mockImplementationOnce(async (_input, callbacks) => {
      await callbacks?.onStreamError?.(new AssistantRunCancelledError())
      throw new AssistantRunCancelledError()
    })

    const response = await postAssistantMessage({ message: 'Stop this run' })
    await waitForBackgroundAssistantRun()

    const assistantMessageWrites = repository.createMessage.mock.calls.filter(
      ([input]) => input.role === 'assistant'
    )

    expect(response.status).toBe(202)
    expect(assistantMessageWrites).toEqual([])
    expect(repository.createSyncAction).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'assistant_run',
        operation: 'update',
        conversationId: 'conversation-1',
        payload: expect.objectContaining({
          type: 'run_failed',
          message: 'Assistant generation stopped',
          code: 'run_cancelled',
        }),
      })
    )
    expect(realtimeNotifier.notifyUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        type: 'assistant:sync_available',
        latestSyncId: expect.any(Number),
      })
    )
  })
})

async function waitForBackgroundAssistantRun(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}
