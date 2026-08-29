import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createWebSocketTicket, verifyWebSocketTicket } from '../websocket-ticket.service'

const originalEncryptionKey = process.env.ENCRYPTION_KEY

describe('WebSocket ticket service', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'
  })

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey
    }
  })

  it('creates short-lived signed tickets that resolve to a user id', () => {
    const ticket = createWebSocketTicket('user-1')

    expect(ticket.token.startsWith('ws-ticket.')).toBe(true)
    expect(ticket.expiresIn).toBe(60)
    expect(verifyWebSocketTicket(ticket.token)).toBe('user-1')
  })

  it('rejects tampered tickets', () => {
    const ticket = createWebSocketTicket('user-1')
    const tampered = ticket.token.replace(/.$/, 'x')

    expect(verifyWebSocketTicket(tampered)).toBeNull()
  })
})
