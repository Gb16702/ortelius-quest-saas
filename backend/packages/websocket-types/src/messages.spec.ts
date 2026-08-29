import { describe, expect, it } from 'bun:test'
import {
  type AssistantLiveDeltaMessage,
  type AssistantSyncAvailableMessage,
  IncomingMessageSchema,
  OutgoingMessageSchema,
} from './messages'

describe('assistant WebSocket message schemas', () => {
  it('accepts assistant sync availability as the explicit outgoing assistant message', () => {
    const message = {
      type: 'assistant:sync_available',
      latestSyncId: 42,
      timestamp: '2026-06-11T12:00:00.000Z',
    } satisfies AssistantSyncAvailableMessage

    expect(OutgoingMessageSchema.safeParse(message).success).toBe(true)
  })

  it('rejects incomplete assistant sync availability messages', () => {
    const message = {
      type: 'assistant:sync_available',
      timestamp: '2026-06-11T12:00:00.000Z',
    }

    expect(OutgoingMessageSchema.safeParse(message).success).toBe(false)
    expect(IncomingMessageSchema.safeParse(message).success).toBe(false)
  })

  it('accepts transient assistant live deltas from the server', () => {
    const message = {
      type: 'assistant:live_delta',
      timestamp: '2026-06-11T12:00:00.000Z',
      conversationId: 'conversation-1',
      partId: 'part-1',
      runId: 'run-1',
      delta: 'Hello',
      content: 'Hello',
    } satisfies AssistantLiveDeltaMessage

    expect(OutgoingMessageSchema.safeParse(message).success).toBe(true)
    expect(IncomingMessageSchema.safeParse(message).success).toBe(false)
  })

  it('does not accept retired assistant delta messages through the custom catch-all', () => {
    const message = {
      type: 'assistant:part_delta',
      timestamp: '2026-06-11T12:00:00.000Z',
      conversationId: 'conversation-1',
      partId: 'part-1',
      delta: 'Hello',
    }

    expect(OutgoingMessageSchema.safeParse(message).success).toBe(false)
    expect(IncomingMessageSchema.safeParse(message).success).toBe(false)
  })
})
