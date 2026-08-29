import { randomUUID } from 'node:crypto'
import type { ContentPart, ModelMessage } from '@tanstack/ai'
import { env } from '../../../infrastructure/config/environment'
import { s3Service } from '../../../infrastructure/storage/s3.service'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import {
  type AssistantContextMessage,
  buildAssistantContextWindow,
} from '../application/assistant-context-window'
import {
  type AssistantConversationCompactor,
  buildAssistantCompactionPlan,
} from '../application/assistant-conversation-compaction'
import type { AssistantAttachment, AssistantConversation } from '../application/assistant-models'
import {
  createAssistantLiveDeltaMessage,
  createAssistantSyncAvailableMessage,
  type serializeAssistantRealtimeAction,
} from '../application/assistant-realtime-events'
import {
  QUEST_ASSISTANT_ACTION_PROPOSED_EVENT,
  QUEST_ASSISTANT_STATUS_EVENT,
} from '../application/assistant-stream-events'
import type { AssistantRealtimeNotifierPort, AssistantRepositoryPort } from '../application/ports'
import type { AssistantMessageRequest } from '../presentation/assistant.schemas'
import type { AssistantAiService } from './assistant-ai.service'
import {
  ASSISTANT_RUN_CANCELLED_CODE,
  AssistantRunCancelledError,
  isAssistantRunCancelledError,
} from './assistant-run-cancellation'
import {
  type AssistantAttachmentContextExtractor,
  assistantAttachmentContextExtractor,
} from './openai-assistant-attachment-context-extractor'
import { assistantConversationCompactor } from './openai-assistant-conversation-compactor'

const ASSISTANT_CONTEXT_UNSUMMARIZED_FETCH_LIMIT = 1_000
const ASSISTANT_TEXT_DELTA_SYNC_FLUSH_INTERVAL_MS = 250

interface AssistantTextPartPublishState {
  id: string
  content: string
  bufferedDelta: string
  bufferedDeltaStartedAt: number | null
  isStarted: boolean
  isCompleted: boolean
}

interface AssistantRunTerminalPublishState {
  isFinished: boolean
}

export interface AssistantAttachmentBinaryLoader {
  loadAttachment(attachment: AssistantAttachment): Promise<Buffer>
}

const s3AssistantAttachmentBinaryLoader: AssistantAttachmentBinaryLoader = {
  loadAttachment(attachment) {
    return s3Service.getFile(attachment.s3Key)
  },
}

export interface AssistantMessageRunJob {
  id: string
  body: AssistantMessageRequest
  conversationId: string
  partId: string
  runId: string
  user: NonNullable<CommonVariables['user']>
  createdAt: string
}

export interface AssistantRunCancellationChecker {
  clearCancelledRun(runId: string): Promise<void>
  isRunCancelled(input: { runId: string; userId: string }): Promise<boolean>
}

export async function runAssistantMessageJob(input: {
  job: AssistantMessageRunJob
  cancellationChecker?: AssistantRunCancellationChecker
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  service: AssistantAiService
  compactor?: AssistantConversationCompactor
  attachmentContextExtractor?: AssistantAttachmentContextExtractor
  attachmentBinaryLoader?: AssistantAttachmentBinaryLoader
}): Promise<void> {
  const conversation = await input.repository.findConversationForUser(
    input.job.conversationId,
    input.job.user.id
  )

  if (!conversation) {
    console.error(`Assistant run job ${input.job.id} references a missing conversation`)
    return
  }

  const part: AssistantTextPartPublishState = {
    id: input.job.partId,
    content: '',
    bufferedDelta: '',
    bufferedDeltaStartedAt: null,
    isStarted: false,
    isCompleted: false,
  }
  const terminalState: AssistantRunTerminalPublishState = {
    isFinished: false,
  }

  try {
    const context = await buildAssistantRunContext({
      body: input.job.body,
      userId: input.job.user.id,
      compactor: input.compactor ?? assistantConversationCompactor,
      attachmentContextExtractor:
        input.attachmentContextExtractor ?? assistantAttachmentContextExtractor,
      attachmentBinaryLoader: input.attachmentBinaryLoader ?? s3AssistantAttachmentBinaryLoader,
      conversation,
      repository: input.repository,
    })

    if (
      await input.cancellationChecker?.isRunCancelled({
        runId: input.job.runId,
        userId: input.job.user.id,
      })
    ) {
      throw new AssistantRunCancelledError()
    }

    await input.service.runMessage(
      {
        ...input.job.body,
        conversationId: conversation.id,
        runId: input.job.runId,
        user: input.job.user,
        messages: context.messages,
      },
      {
        onTextDelta: async ({ delta, content }) => {
          if (delta.length === 0) return

          await throwIfAssistantRunCancelled({
            cancellationChecker: input.cancellationChecker,
            runId: input.job.runId,
            userId: input.job.user.id,
          })
          await publishAssistantTextPartStartedEvent({
            conversation,
            partId: part.id,
            realtimeNotifier: input.realtimeNotifier,
            repository: input.repository,
            runId: input.job.runId,
            state: part,
            userId: input.job.user.id,
          })
          part.content = content
          void publishAssistantTextPartLiveDelta({
            content,
            conversation,
            delta,
            partId: part.id,
            realtimeNotifier: input.realtimeNotifier,
            runId: input.job.runId,
            userId: input.job.user.id,
          })
          await bufferAssistantTextPartDeltaEvent({
            conversation,
            delta,
            partId: part.id,
            realtimeNotifier: input.realtimeNotifier,
            repository: input.repository,
            runId: input.job.runId,
            state: part,
            userId: input.job.user.id,
          })
        },
        onTextComplete: async (content) => {
          await throwIfAssistantRunCancelled({
            cancellationChecker: input.cancellationChecker,
            runId: input.job.runId,
            userId: input.job.user.id,
          })
          await completeAssistantMessageRun({
            body: input.job.body,
            content,
            conversation,
            part,
            realtimeNotifier: input.realtimeNotifier,
            repository: input.repository,
            runId: input.job.runId,
            terminalState,
            userId: input.job.user.id,
          })
        },
        onStreamError: async (error) => {
          const failure = (await isAssistantRunCancellationRequested({
            cancellationChecker: input.cancellationChecker,
            runId: input.job.runId,
            userId: input.job.user.id,
          }))
            ? getAssistantRunFailure(new AssistantRunCancelledError())
            : getAssistantRunFailure(error)
          await publishAssistantRunFailedEvent({
            code: failure.code,
            conversation,
            message: failure.message,
            realtimeNotifier: input.realtimeNotifier,
            repository: input.repository,
            runId: input.job.runId,
            state: terminalState,
            userId: input.job.user.id,
          })
        },
        onCustomEvent: async (event) => {
          await throwIfAssistantRunCancelled({
            cancellationChecker: input.cancellationChecker,
            runId: input.job.runId,
            userId: input.job.user.id,
          })
          if (event.name === QUEST_ASSISTANT_STATUS_EVENT) {
            await publishAssistantReasoningStatusEvent({
              conversation,
              body: event.value.body,
              label: event.value.label,
              realtimeNotifier: input.realtimeNotifier,
              repository: input.repository,
              runId: input.job.runId,
              userId: input.job.user.id,
            })
            return
          }

          if (event.name !== QUEST_ASSISTANT_ACTION_PROPOSED_EVENT) return

          await publishAssistantActionProposedEvent({
            action: event.value.action,
            conversation,
            realtimeNotifier: input.realtimeNotifier,
            repository: input.repository,
            runId: input.job.runId,
            userId: input.job.user.id,
          })
        },
      }
    )
    await throwIfAssistantRunCancelled({
      cancellationChecker: input.cancellationChecker,
      runId: input.job.runId,
      userId: input.job.user.id,
    })
    await completeAssistantMessageRun({
      body: input.job.body,
      content: part.content,
      conversation,
      part,
      realtimeNotifier: input.realtimeNotifier,
      repository: input.repository,
      runId: input.job.runId,
      terminalState,
      userId: input.job.user.id,
    })
  } catch (error) {
    if (!isAssistantRunCancelledError(error)) {
      console.error('Failed to run assistant message:', error)
    }
    const failure = getAssistantRunFailure(error)
    await publishAssistantRunFailedEvent({
      code: failure.code,
      conversation,
      message: failure.message,
      realtimeNotifier: input.realtimeNotifier,
      repository: input.repository,
      runId: input.job.runId,
      state: terminalState,
      userId: input.job.user.id,
    })
  } finally {
    await input.cancellationChecker?.clearCancelledRun(input.job.runId)
  }
}

function getAssistantRunFailure(error: unknown): { message: string; code: string } {
  if (isAssistantRunCancelledError(error)) {
    return {
      message: error.message,
      code: ASSISTANT_RUN_CANCELLED_CODE,
    }
  }

  return {
    message: 'Assistant stream failed',
    code: 'stream_error',
  }
}

async function notifyAssistantSyncAvailable(
  input: {
    latestSyncId?: number
    realtimeNotifier: AssistantRealtimeNotifierPort
    repository: AssistantRepositoryPort
    userId: string
  },
  errorMessage: string
): Promise<void> {
  try {
    const latestSyncId =
      input.latestSyncId ?? (await input.repository.getLastSyncIdForUser(input.userId))
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

async function throwIfAssistantRunCancelled(input: {
  cancellationChecker: AssistantRunCancellationChecker | undefined
  runId: string
  userId: string
}): Promise<void> {
  if (await isAssistantRunCancellationRequested(input)) {
    throw new AssistantRunCancelledError()
  }
}

async function isAssistantRunCancellationRequested(input: {
  cancellationChecker: AssistantRunCancellationChecker | undefined
  runId: string
  userId: string
}): Promise<boolean> {
  return Boolean(
    await input.cancellationChecker?.isRunCancelled({
      runId: input.runId,
      userId: input.userId,
    })
  )
}

async function buildAssistantRunContext(input: {
  body: AssistantMessageRequest
  userId: string
  compactor: AssistantConversationCompactor
  attachmentContextExtractor: AssistantAttachmentContextExtractor
  attachmentBinaryLoader: AssistantAttachmentBinaryLoader
  conversation: AssistantConversation
  repository: AssistantRepositoryPort
}): Promise<{ messages: ModelMessage[] }> {
  const totalPersistedMessageCount = await input.repository.countMessages(input.conversation.id)
  const totalPreviousMessageCount = Math.max(0, totalPersistedMessageCount - 1)
  const summarizedMessageCount = Math.min(
    input.conversation.summaryMessageCount,
    totalPreviousMessageCount
  )
  let previousMessages = (
    await input.repository.listMessagesAfterOffset(
      input.conversation.id,
      summarizedMessageCount,
      ASSISTANT_CONTEXT_UNSUMMARIZED_FETCH_LIMIT
    )
  ).filter((message) => message.id !== input.body.userMessageId)
  let conversationSummary = input.conversation.summary
    ? {
        content: input.conversation.summary,
        tokenEstimate: input.conversation.summaryTokenEstimate,
      }
    : null
  const attachments =
    input.body.attachmentIds.length > 0
      ? await input.repository.findAttachmentsForUser({
          userId: input.userId,
          attachmentIds: input.body.attachmentIds,
        })
      : []
  const pdfContext = await input.attachmentContextExtractor.extractPdfContext(attachments)
  const currentUserMessage = buildCurrentUserMessageWithAttachments({
    message: input.body.message,
    attachments,
    pdfContext,
  })
  let contextWindow = buildAssistantContextWindow({
    previousMessages,
    currentUserMessage,
    conversationSummary,
    compactionThresholdTokens: env.QUEST_ASSISTANT_CONTEXT_COMPACTION_THRESHOLD_TOKENS,
    hardLimitTokens: env.QUEST_ASSISTANT_CONTEXT_HARD_LIMIT_TOKENS,
  })

  if (contextWindow.compactionNeeded) {
    const plan = buildAssistantCompactionPlan({
      previousMessages,
      currentUserMessage,
      compactionThresholdTokens: env.QUEST_ASSISTANT_CONTEXT_COMPACTION_THRESHOLD_TOKENS,
    })

    if (plan.messagesToSummarize.length > 0) {
      try {
        const summaryResult = await input.compactor.compact({
          previousSummary: input.conversation.summary,
          messages: plan.messagesToSummarize,
        })
        const nextSummaryMessageCount = summarizedMessageCount + plan.messagesToSummarize.length

        await input.repository.updateConversationSummary({
          conversationId: input.conversation.id,
          summary: summaryResult.summary,
          summaryMessageCount: nextSummaryMessageCount,
          summaryTokenEstimate: summaryResult.tokenEstimate,
        })

        conversationSummary = {
          content: summaryResult.summary,
          tokenEstimate: summaryResult.tokenEstimate,
        }
        previousMessages = plan.remainingMessages
        contextWindow = buildAssistantContextWindow({
          previousMessages,
          currentUserMessage,
          conversationSummary,
          compactionThresholdTokens: env.QUEST_ASSISTANT_CONTEXT_COMPACTION_THRESHOLD_TOKENS,
          hardLimitTokens: env.QUEST_ASSISTANT_CONTEXT_HARD_LIMIT_TOKENS,
        })
      } catch (error) {
        console.error('Failed to compact assistant conversation:', error)
      }
    }
  }

  return {
    messages: await attachImagePartsToCurrentUserMessage(
      contextWindow.messages.map(toModelMessage),
      attachments,
      input.attachmentBinaryLoader
    ),
  }
}

function toModelMessage(message: AssistantContextMessage): ModelMessage {
  return {
    role: message.role,
    content: message.content,
  }
}

function buildCurrentUserMessageWithAttachments(input: {
  message: string
  attachments: AssistantAttachment[]
  pdfContext: string
}): string {
  const lines = [input.message.trim() || 'Please review the attached files.']

  if (input.attachments.length > 0) {
    lines.push(
      `Attached files:\n${input.attachments.map(formatAssistantAttachmentLine).join('\n')}`
    )
  }

  if (input.pdfContext.trim().length > 0) {
    lines.push(`Extracted document context:\n${input.pdfContext.trim()}`)
  }

  return lines.join('\n\n')
}

function formatAssistantAttachmentLine(attachment: AssistantAttachment): string {
  return `- ${attachment.originalName} (${attachment.mimeType}, ${attachment.size} bytes)`
}

async function attachImagePartsToCurrentUserMessage(
  messages: ModelMessage[],
  attachments: AssistantAttachment[],
  attachmentBinaryLoader: AssistantAttachmentBinaryLoader
): Promise<ModelMessage[]> {
  const imageParts = await loadImageContentParts(attachments, attachmentBinaryLoader)
  if (imageParts.length === 0) return messages

  const currentUserMessageIndex = findLastUserMessageIndex(messages)
  if (currentUserMessageIndex === -1) return messages

  const currentMessage = messages[currentUserMessageIndex]
  const text =
    typeof currentMessage.content === 'string'
      ? currentMessage.content
      : 'Please review the attached images.'

  return messages.map((message, index) =>
    index === currentUserMessageIndex
      ? {
          ...message,
          content: [
            {
              type: 'text',
              content: text,
            },
            ...imageParts,
          ],
        }
      : message
  )
}

function findLastUserMessageIndex(messages: ModelMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'user') return index
  }

  return -1
}

function isImageAttachment(attachment: AssistantAttachment): boolean {
  return attachment.mimeType.startsWith('image/')
}

async function loadImageContentParts(
  attachments: AssistantAttachment[],
  attachmentBinaryLoader: AssistantAttachmentBinaryLoader
): Promise<ContentPart[]> {
  const imageAttachments = attachments.filter(isImageAttachment)
  if (imageAttachments.length === 0) return []

  const imageParts: Array<ContentPart | null> = await Promise.all(
    imageAttachments.map(async (attachment) => {
      try {
        const buffer = await attachmentBinaryLoader.loadAttachment(attachment)

        return {
          type: 'image',
          source: {
            type: 'data',
            value: buffer.toString('base64'),
            mimeType: attachment.mimeType,
          },
          metadata: {
            detail: 'auto',
          },
        } satisfies ContentPart
      } catch (error) {
        console.error(`Failed to load assistant image attachment ${attachment.id}:`, error)
        return null
      }
    })
  )

  return imageParts.filter((part): part is ContentPart => Boolean(part))
}

async function completeAssistantMessageRun(input: {
  body: AssistantMessageRequest
  content: string
  conversation: AssistantConversation
  part: AssistantTextPartPublishState
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  terminalState: AssistantRunTerminalPublishState
  userId: string
}) {
  if (input.terminalState.isFinished) return

  const content = input.content.trim()
  let messageId: string | null = null

  if (content.length > 0) {
    await publishAssistantTextPartStartedEvent({
      conversation: input.conversation,
      partId: input.part.id,
      realtimeNotifier: input.realtimeNotifier,
      repository: input.repository,
      runId: input.runId,
      state: input.part,
      userId: input.userId,
    })
    await flushAssistantTextPartDeltaEvent({
      conversation: input.conversation,
      partId: input.part.id,
      realtimeNotifier: input.realtimeNotifier,
      repository: input.repository,
      runId: input.runId,
      state: input.part,
      userId: input.userId,
    })
    input.part.content = input.content
    const assistantMessage = await input.repository.createMessage({
      id: input.part.id,
      conversationId: input.conversation.id,
      role: 'assistant',
      content: input.content,
      metadata: {
        runId: input.runId,
        routePath: input.body.context?.routePath,
        organizationId: input.body.context?.organizationId,
      },
    })
    messageId = assistantMessage.id
    await publishAssistantTextPartCompletedEvent({
      content: input.content,
      conversation: input.conversation,
      partId: input.part.id,
      realtimeNotifier: input.realtimeNotifier,
      repository: input.repository,
      runId: input.runId,
      state: input.part,
      userId: input.userId,
    })
  }

  await input.repository.touchConversation({
    conversationId: input.conversation.id,
    lastRoutePath: input.body.context?.routePath,
  })
  await publishAssistantRunCompletedEvent({
    conversation: input.conversation,
    messageId,
    realtimeNotifier: input.realtimeNotifier,
    repository: input.repository,
    runId: input.runId,
    state: input.terminalState,
    userId: input.userId,
  })
}

async function publishAssistantTextPartStartedEvent(input: {
  conversation: AssistantConversation
  partId: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  state: AssistantTextPartPublishState
  userId: string
}): Promise<void> {
  if (input.state.isStarted) return

  try {
    const now = new Date()
    const timestamp = now.toISOString()
    const syncAction = await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_part',
      modelId: input.partId,
      operation: 'insert',
      payload: {
        type: 'part_started',
        part: {
          id: input.partId,
          conversationId: input.conversation.id,
          runId: input.runId,
          type: 'text',
          role: 'assistant',
          status: 'streaming',
          content: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    })
    await notifyAssistantSyncAvailable(
      {
        latestSyncId: syncAction.syncId,
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant text part start'
    )
    input.state.isStarted = true
  } catch (error) {
    console.error('Failed to publish assistant text part start:', error)
  }
}

async function bufferAssistantTextPartDeltaEvent(input: {
  conversation: AssistantConversation
  delta: string
  partId: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  state: AssistantTextPartPublishState
  userId: string
}): Promise<void> {
  input.state.bufferedDelta += input.delta
  input.state.bufferedDeltaStartedAt ??= Date.now()

  if (
    Date.now() - input.state.bufferedDeltaStartedAt <
    ASSISTANT_TEXT_DELTA_SYNC_FLUSH_INTERVAL_MS
  ) {
    return
  }

  await flushAssistantTextPartDeltaEvent(input)
}

async function publishAssistantTextPartLiveDelta(input: {
  content: string
  conversation: AssistantConversation
  delta: string
  partId: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  runId: string
  userId: string
}): Promise<void> {
  try {
    await input.realtimeNotifier.notifyUser(
      input.userId,
      createAssistantLiveDeltaMessage({
        conversationId: input.conversation.id,
        partId: input.partId,
        runId: input.runId,
        delta: input.delta,
        content: input.content,
      })
    )
  } catch (error) {
    console.error('Failed to publish assistant live text delta:', error)
  }
}

async function flushAssistantTextPartDeltaEvent(input: {
  conversation: AssistantConversation
  partId: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  state: AssistantTextPartPublishState
  userId: string
}): Promise<void> {
  const delta = input.state.bufferedDelta
  if (delta.length === 0) return

  input.state.bufferedDelta = ''
  input.state.bufferedDeltaStartedAt = null

  try {
    const syncAction = await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_part',
      modelId: input.partId,
      operation: 'update',
      payload: {
        type: 'part_delta',
        partId: input.partId,
        delta,
        content: input.state.content,
      },
    })
    await notifyAssistantSyncAvailable(
      {
        latestSyncId: syncAction.syncId,
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant text part delta'
    )
  } catch (error) {
    console.error('Failed to publish assistant text part delta:', error)
  }
}

async function publishAssistantTextPartCompletedEvent(input: {
  content: string
  conversation: AssistantConversation
  partId: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  state: AssistantTextPartPublishState
  userId: string
}): Promise<void> {
  if (input.state.isCompleted) return

  try {
    const syncAction = await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_part',
      modelId: input.partId,
      operation: 'update',
      payload: {
        type: 'part_completed',
        partId: input.partId,
        content: input.content,
      },
    })
    await notifyAssistantSyncAvailable(
      {
        latestSyncId: syncAction.syncId,
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant text part completion'
    )
    input.state.isCompleted = true
  } catch (error) {
    console.error('Failed to publish assistant text part completion:', error)
  }
}

async function publishAssistantReasoningStatusEvent(input: {
  body: string
  conversation: AssistantConversation
  label: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  userId: string
}): Promise<void> {
  const partId = randomUUID()

  try {
    const now = new Date()
    const timestamp = now.toISOString()
    await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_part',
      modelId: partId,
      operation: 'insert',
      payload: {
        type: 'part_started',
        part: {
          id: partId,
          conversationId: input.conversation.id,
          runId: input.runId,
          type: 'reasoning',
          role: 'assistant',
          status: 'streaming',
          content: '',
          metadata: {
            label: input.label,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    })
    const completedAction = await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_part',
      modelId: partId,
      operation: 'update',
      payload: {
        type: 'part_completed',
        partId,
        content: input.body,
      },
    })
    await notifyAssistantSyncAvailable(
      {
        latestSyncId: completedAction.syncId,
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant reasoning status'
    )
  } catch (error) {
    console.error('Failed to publish assistant reasoning status:', error)
  }
}

async function publishAssistantRunCompletedEvent(input: {
  conversation: AssistantConversation
  messageId: string | null
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  state: AssistantRunTerminalPublishState
  userId: string
}): Promise<void> {
  if (input.state.isFinished) return
  input.state.isFinished = true

  try {
    const completedAt = new Date().toISOString()
    const syncAction = await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_run',
      modelId: input.runId,
      operation: 'update',
      payload: {
        type: 'run_completed',
        messageId: input.messageId,
        completedAt,
      },
    })
    await notifyAssistantSyncAvailable(
      {
        latestSyncId: syncAction.syncId,
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant run completion'
    )
  } catch (error) {
    console.error('Failed to publish assistant run completion:', error)
  }
}

async function publishAssistantRunFailedEvent(input: {
  code: string
  conversation: AssistantConversation
  message: string
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  state: AssistantRunTerminalPublishState
  userId: string
}): Promise<void> {
  if (input.state.isFinished) return
  input.state.isFinished = true

  try {
    const syncAction = await input.repository.createSyncAction({
      userId: input.userId,
      organizationId: input.conversation.organizationId,
      conversationId: input.conversation.id,
      modelName: 'assistant_run',
      modelId: input.runId,
      operation: 'update',
      payload: {
        type: 'run_failed',
        message: input.message,
        code: input.code,
      },
    })
    await notifyAssistantSyncAvailable(
      {
        latestSyncId: syncAction.syncId,
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant run failure'
    )
  } catch (error) {
    console.error('Failed to publish assistant run failure:', error)
  }
}

async function publishAssistantActionProposedEvent(input: {
  action: ReturnType<typeof serializeAssistantRealtimeAction>
  conversation: AssistantConversation
  realtimeNotifier: AssistantRealtimeNotifierPort
  repository: AssistantRepositoryPort
  runId: string
  userId: string
}): Promise<void> {
  try {
    await notifyAssistantSyncAvailable(
      {
        realtimeNotifier: input.realtimeNotifier,
        repository: input.repository,
        userId: input.userId,
      },
      'Failed to publish assistant action proposal'
    )
  } catch (error) {
    console.error('Failed to publish assistant action proposal:', error)
  }
}
