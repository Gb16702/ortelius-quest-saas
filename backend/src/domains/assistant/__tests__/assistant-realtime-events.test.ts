import { describe, expect, it } from 'bun:test'
import type { AssistantAction } from '../application/assistant-models'
import {
  createAssistantLiveDeltaMessage,
  createAssistantSyncAvailableMessage,
  serializeAssistantRealtimeAction,
} from '../application/assistant-realtime-events'

const assistantAction: AssistantAction = {
  id: 'action-1',
  conversationId: 'realtime-conversation-2',
  userId: 'user-1',
  organizationId: 'org-1',
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
  expiresAt: new Date('2026-06-11T12:10:00.000Z'),
  confirmedAt: null,
  executedAt: null,
  cancelledAt: null,
  createdAt: new Date('2026-06-11T12:00:00.000Z'),
  updatedAt: new Date('2026-06-11T12:00:00.000Z'),
}

describe('Assistant realtime events', () => {
  it('creates sync availability messages for websocket notification', () => {
    expect(
      createAssistantSyncAvailableMessage({
        latestSyncId: 42,
        timestamp: '2026-06-11T12:00:00.000Z',
      })
    ).toEqual({
      type: 'assistant:sync_available',
      latestSyncId: 42,
      timestamp: '2026-06-11T12:00:00.000Z',
    })
  })

  it('creates transient live delta messages for immediate rendering', () => {
    expect(
      createAssistantLiveDeltaMessage({
        conversationId: 'conversation-1',
        partId: 'part-1',
        runId: 'run-1',
        delta: 'Hello',
        content: 'Hello',
        timestamp: '2026-06-11T12:00:00.000Z',
      })
    ).toEqual({
      type: 'assistant:live_delta',
      conversationId: 'conversation-1',
      partId: 'part-1',
      runId: 'run-1',
      delta: 'Hello',
      content: 'Hello',
      timestamp: '2026-06-11T12:00:00.000Z',
    })
  })

  it('serializes assistant actions for tool result payloads', () => {
    const action = serializeAssistantRealtimeAction(assistantAction)

    expect(action).toEqual({
      id: 'action-1',
      conversationId: 'realtime-conversation-2',
      userId: 'user-1',
      organizationId: 'org-1',
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
      expiresAt: '2026-06-11T12:10:00.000Z',
      confirmedAt: null,
      executedAt: null,
      cancelledAt: null,
      createdAt: '2026-06-11T12:00:00.000Z',
      updatedAt: '2026-06-11T12:00:00.000Z',
    })
  })
})
