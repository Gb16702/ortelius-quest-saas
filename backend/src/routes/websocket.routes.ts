import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/bun'
import {
  handleWsClose,
  handleWsError,
  handleWsMessage,
  handleWsOpen,
} from '../domains/realtime/presentation/realtime.routes'
import type { AuthVariables } from '../infrastructure/auth/auth.middleware'

const websocketRoutes = new Hono<{ Variables: AuthVariables }>()

websocketRoutes.get(
  '/',
  upgradeWebSocket((c) => {
    try {
      const user = c.get('user')

      if (!user) {
        throw new Error('Authentication required')
      }

      const userId = user.id

      return {
        onOpen: (_evt, ws) => handleWsOpen(userId, ws as unknown as WebSocket),
        onMessage: (evt, ws) => handleWsMessage(userId, evt, ws as unknown as WebSocket),
        onClose: (evt, ws) => handleWsClose(userId, ws as unknown as WebSocket, evt),
        onError: (evt, ws) => handleWsError(userId, ws as unknown as WebSocket, evt),
      }
    } catch (error) {
      console.error('WebSocket authentication failed:', error)
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  })
)

export default websocketRoutes
