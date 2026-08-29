import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mocks ----------

const handleMessageMock = mock(() => Promise.resolve())
const handlePongMock = mock(() => undefined)
const consoleErrorSpy = mock(() => undefined)

mock.module('../infrastructure/realtime.service', () => ({
  realtimeService: {
    handleMessage: handleMessageMock,
    handleConnection: mock(() => Promise.resolve()),
    handleDisconnection: mock(() => undefined),
    sendParticipantsToConversation: mock(() => Promise.resolve()),
  },
}))

mock.module('../../../infrastructure/messaging/websocket.service', () => ({
  handlePong: handlePongMock,
  handleClose: mock(() => Promise.resolve()),
  handleError: mock(() => undefined),
}))

import { handleWsMessage } from '../presentation/realtime.routes'

beforeEach(() => {
  handleMessageMock.mockClear()
  handlePongMock.mockClear()
})

describe('handleWsMessage', () => {
  it('routes connection:pong to handlePong (not handleMessage)', async () => {
    const ws = {} as WebSocket
    const evt = {
      data: JSON.stringify({ type: 'connection:pong', timestamp: '2026-05-06T00:00:00.000Z' }),
    } as MessageEvent

    await handleWsMessage('alice', evt, ws)

    expect(handlePongMock).toHaveBeenCalledTimes(1)
    expect(handleMessageMock).not.toHaveBeenCalled()
  })

  it('routes valid non-pong messages to handleMessage', async () => {
    const ws = {} as WebSocket
    const evt = {
      data: JSON.stringify({
        type: 'chat:typing',
        conversationId: 'conv-1',
        isTyping: true,
        timestamp: '2026-05-06T00:00:00.000Z',
      }),
    } as MessageEvent

    await handleWsMessage('alice', evt, ws)

    expect(handleMessageMock).toHaveBeenCalledTimes(1)
    expect(handleMessageMock.mock.calls[0]?.[0]).toBe('alice')
  })

  it('logs and ignores malformed JSON — does NOT re-inject a synthetic pong', async () => {
    // Regression: the old code injected `{ type: 'connection:pong' }` into
    // handleMessage on parse error, which then hit unknown_message_type and
    // burned a slot of the per-user rate limit.
    const originalError = console.error
    console.error = consoleErrorSpy

    try {
      const ws = {} as WebSocket
      const evt = { data: '{not-json' } as MessageEvent

      await handleWsMessage('alice', evt, ws)

      expect(handleMessageMock).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    } finally {
      console.error = originalError
    }
  })
})
