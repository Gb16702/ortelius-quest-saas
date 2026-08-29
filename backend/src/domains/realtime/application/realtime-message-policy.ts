import type { IncomingMessage } from '@ortelius/websocket-types'

const BROADCAST_RATE_LIMITED_TYPES = new Set<IncomingMessage['type']>(['chat:typing'])

export function requiresBroadcastRateLimit(type: IncomingMessage['type']): boolean {
  return BROADCAST_RATE_LIMITED_TYPES.has(type)
}

export function isActiveConversationMessage(
  message: IncomingMessage
): message is IncomingMessage & { type: 'conversation:set_active' } {
  return message.type === 'conversation:set_active'
}

export function createUnknownMessagePayload(type: string) {
  return {
    type: 'error' as const,
    code: 'unknown_message_type',
    message: `Unknown message type: ${type}`,
    timestamp: new Date().toISOString(),
  }
}
