import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/bun'
import { callWebSocketManager } from '../domains/calls/infrastructure/call-ws.manager'
import type { AuthVariables } from '../infrastructure/auth/auth.middleware'

const callWsRoutes = new Hono<{ Variables: AuthVariables }>()

type Sendable = { send: (data: string) => void; readyState?: number }

callWsRoutes.get(
  '/',
  upgradeWebSocket((c) => {
    const user = c.get('user')
    if (!user) {
      throw new Error('Authentication required')
    }
    const userId = user.id
    let wsRef: Sendable | null = null

    return {
      onOpen: (_evt, ws) => {
        wsRef = ws as unknown as Sendable
        callWebSocketManager.handleConnection(wsRef, userId)
      },
      onMessage: async (evt, ws) => {
        const ref = (ws as unknown as Sendable) ?? wsRef
        const data = typeof evt.data === 'string' ? evt.data : Buffer.from(evt.data as ArrayBuffer)
        await callWebSocketManager.handleMessage(ref, data, userId)
      },
      onClose: (_evt, ws) => {
        const ref = (ws as unknown as Sendable) ?? wsRef
        if (ref) callWebSocketManager.handleDisconnection(ref, userId)
      },
      onError: (evt) => {
        console.error(`[CallWS] WebSocket error for user ${userId}:`, evt)
      },
    }
  })
)

export default callWsRoutes
