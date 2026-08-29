import { describe, expect, it } from 'bun:test'
import {
  createUnknownMessagePayload,
  requiresBroadcastRateLimit,
} from '../application/realtime-message-policy'

describe('Realtime message policy', () => {
  it('rate limits only broadcast fan-out message types', () => {
    expect(requiresBroadcastRateLimit('chat:typing')).toBe(true)
    expect(requiresBroadcastRateLimit('conversation:set_active')).toBe(false)
  })

  it('keeps the legacy unknown message error contract', () => {
    const payload = createUnknownMessagePayload('custom:unknown')

    expect(payload.type).toBe('error')
    expect(payload.code).toBe('unknown_message_type')
    expect(payload.message).toBe('Unknown message type: custom:unknown')
    expect(typeof payload.timestamp).toBe('string')
  })
})
