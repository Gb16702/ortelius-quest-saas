import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { websocket } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { startAssistantRunProcessor } from './domains/assistant/infrastructure/assistant-run-worker'
import { registerCallEventHandlers } from './domains/calls/infrastructure/call-events.handler'
import { startCallMissedScheduler } from './domains/calls/infrastructure/call-missed.scheduler'
import { callWebSocketManager } from './domains/calls/infrastructure/call-ws.manager'
import { transcriptionQueue } from './domains/calls/infrastructure/calls.services'
import { startVoipCanaryScheduler } from './domains/calls/infrastructure/voip-canary.scheduler'
import organizationOgRoutes from './domains/organization/presentation/organization-og.routes'
import { requestsApplicationService } from './domains/requests/requests.application'
import { onFirstAuthenticatedAccess } from './infrastructure/auth/user-provisioning.service'
import { env } from './infrastructure/config/environment'
import { conditionalEtagMiddleware } from './infrastructure/http/conditional-etag.middleware'
import { initializeDistributedWebSocket } from './infrastructure/messaging/websocket.service'
import { handleError } from './infrastructure/monitoring/error-handler.service'
import { assertTurnConfig } from './infrastructure/networking/turn.utils'
import adminRoutes from './routes/admin.routes'
import apiRoutes from './routes/api.routes'

const app = new Hono()

app.use('*', timing())
app.use('*', conditionalEtagMiddleware)
app.use('*', logger())
app.use('*', secureHeaders())

app.get('/docs', Scalar({ url: '/doc', pageTitle: 'Ortelius Quest API' }))
app.get('/doc', (c) => {
  return c.json({ info: { title: 'Ortelius Quest API', version: '1.0.0' } })
})

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return origin

      const allowedOrigins = env.CORS_ORIGINS ?? ['http://localhost:5173']

      if (allowedOrigins.includes(origin)) return origin

      if (origin.endsWith('.ortelius.app') || origin === 'https://ortelius.app') {
        return origin
      }

      return null
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 600,
    credentials: true,
  })
)

app.route('/admin', adminRoutes)
app.route('/og', organizationOgRoutes)
app.route('/api', apiRoutes)

app.onError((err, c) => {
  return handleError(c, err)
})

const port = process.env.PORT || 3000

await initializeDistributedWebSocket()

startAssistantRunProcessor()
transcriptionQueue.startProcessor()

registerCallEventHandlers()
callWebSocketManager.start()
startCallMissedScheduler()
startVoipCanaryScheduler()
assertTurnConfig()

onFirstAuthenticatedAccess(async (email, userId) => {
  await requestsApplicationService.linkRequestsToUser(email, userId)
})

export default {
  fetch: app.fetch,
  websocket,
  port,
}
