import type { CustomWebSocket, IncomingMessage } from '@ortelius/websocket-types'
import { Hono } from 'hono'
import {
  handlePong,
  handleClose as wsHandleClose,
  handleError as wsHandleError,
} from '../../../infrastructure/messaging/websocket.service'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { realtimeService } from '../infrastructure/realtime.service'

const realtimeRoutes = new Hono<{ Variables: CommonVariables }>()

export const handleWsOpen = async (userId: string, ws: WebSocket, clientIP?: string) => {
  return realtimeService.handleConnection(userId, ws, clientIP)
}

export const handleWsMessage = async (userId: string, evt: MessageEvent, ws: WebSocket) => {
  try {
    const data = JSON.parse(evt.data) as IncomingMessage

    if (data.type === 'connection:pong') {
      handlePong(ws as CustomWebSocket)
      return
    }

    await realtimeService.handleMessage(userId, data)
  } catch (error) {
    // Just log — the WS layer's own ping/pong already keeps the connection
    // alive. Re-injecting a fake `{ type: 'connection:pong' }` into
    // handleMessage hit the unknown_message_type branch and burned a slot of
    // the per-user rate limit, which then made legitimate messages get
    // throttled. The keepalive belief was always wrong.
    console.error(`Error parsing WebSocket message for user ${userId}:`, error)
  }
}

export const handleWsClose = async (userId: string, ws?: WebSocket, event?: CloseEvent) => {
  if (ws) {
    await wsHandleClose(ws as CustomWebSocket, event, userId)
  }
  return realtimeService.handleDisconnection(userId, ws)
}

export const handleWsError = (_userId: string, ws: WebSocket, error: Event | ErrorEvent) => {
  wsHandleError(ws as CustomWebSocket, error)
}

export const sendParticipantsToConversation = async (conversationId: string) => {
  return realtimeService.sendParticipantsToConversation(conversationId)
}

export default realtimeRoutes
