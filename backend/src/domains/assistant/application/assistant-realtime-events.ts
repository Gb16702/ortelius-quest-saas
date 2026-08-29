import type {
  AssistantLiveDeltaMessage,
  AssistantRealtimeAction,
  AssistantSyncAvailableMessage,
} from '@ortelius/websocket-types'
import type { AssistantAction } from './assistant-models'

export function createAssistantSyncAvailableMessage(input: {
  latestSyncId: number
  timestamp?: string
}): AssistantSyncAvailableMessage {
  return {
    type: 'assistant:sync_available',
    latestSyncId: input.latestSyncId,
    timestamp: input.timestamp ?? new Date().toISOString(),
  }
}

export function createAssistantLiveDeltaMessage(input: {
  conversationId: string
  partId: string
  runId: string | null
  delta: string
  content: string
  timestamp?: string
}): AssistantLiveDeltaMessage {
  return {
    type: 'assistant:live_delta',
    conversationId: input.conversationId,
    partId: input.partId,
    runId: input.runId,
    delta: input.delta,
    content: input.content,
    timestamp: input.timestamp ?? new Date().toISOString(),
  }
}

export function serializeAssistantRealtimeAction(action: AssistantAction): AssistantRealtimeAction {
  return {
    id: action.id,
    conversationId: action.conversationId,
    userId: action.userId,
    organizationId: action.organizationId,
    type: action.type,
    status: action.status,
    title: action.title,
    summary: action.summary,
    buttonLabel: action.buttonLabel,
    riskLevel: action.riskLevel,
    requiresConfirmation: action.requiresConfirmation,
    payload: action.payload,
    preview: action.preview,
    result: action.result,
    errorMessage: action.errorMessage,
    expiresAt: action.expiresAt.toISOString(),
    confirmedAt: action.confirmedAt?.toISOString() ?? null,
    executedAt: action.executedAt?.toISOString() ?? null,
    cancelledAt: action.cancelledAt?.toISOString() ?? null,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  }
}
