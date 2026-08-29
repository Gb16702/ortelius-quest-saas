import { Hono } from 'hono'
import activityRoutes from '../domains/activity/presentation/activity.routes'
import appShellRoutes from '../domains/app-shell/presentation/app-shell.routes'
import assistantRoutes from '../domains/assistant/presentation/assistant.routes'
import authRoutes from '../domains/auth/presentation/auth.routes'
import callsRoutes from '../domains/calls/presentation/calls.routes'
import categoryRoutes from '../domains/categories/presentation/categories.routes'
import checkoutRoutes from '../domains/checkout/presentation/checkout.routes'
import contactRoutes from '../domains/contact/presentation/contact.routes'
import documentRoutes from '../domains/documents/presentation/documents.routes'
import eblastRoutes from '../domains/eblast/presentation/eblast.routes'
import favoriteRoutes from '../domains/favorites/presentation/favorites.routes'
import invitationRoutes from '../domains/invitations/presentation/invitations.routes'
import invoiceRoutes from '../domains/invoice/presentation/invoice.routes'
import legalDocumentRoutes from '../domains/legal-document/presentation/legal-document.routes'
import membersRoutes from '../domains/members/presentation/members.routes'
import conversationRoutes from '../domains/messaging/conversation/presentation/conversation.routes'
import messageRoutes from '../domains/messaging/message/presentation/message.routes'
import messageReadRoutes from '../domains/messaging/message-read/presentation/message-read.routes'
import metricsRoutes from '../domains/metrics/presentation/metrics.routes'
import notificationRoutes from '../domains/notifications/presentation/notifications.routes'
import onboardingRoutes from '../domains/onboarding/presentation/onboarding.routes'
import organizationRoutes from '../domains/organization/presentation/organization.routes'
import organizationStatusRoutes from '../domains/organization/presentation/organization-status.routes'
import pricingIntelligenceRoutes from '../domains/pricing-intelligence/presentation/pricing-intelligence.routes'
import quoteRoutes from '../domains/quote/presentation/quote.routes'
import requestRoutes from '../domains/requests/presentation/requests.routes'
import serviceRoutes from '../domains/services/presentation/services.routes'
import storageRoutes from '../domains/storage/presentation/storage.routes'
import subscriptionRoutes from '../domains/subscription/presentation/subscription.routes'
import userRoutes from '../domains/user/presentation/user.routes'
import stripeWebhookRoutes from '../domains/webhooks/presentation/stripe-webhook.routes'
import webhooksRoutes from '../domains/webhooks/presentation/webhooks.routes'
import { type AuthVariables, authMiddleware } from '../infrastructure/auth/auth.middleware'
import { createGraphQLServer } from '../infrastructure/graphql/graphql.server'
import { createGraphQLServerTiming } from '../infrastructure/graphql/graphql.timing'
import callWsRoutes from './call-ws.routes'
import pdfRoutes from './pdf.routes'
import websocketRoutes from './websocket.routes'

const apiRoutes = new Hono<{ Variables: AuthVariables }>()

apiRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    commit: process.env.GIT_COMMIT || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  })
})

// Public routes (no auth required) - for marketing site
apiRoutes.route('/contact', contactRoutes)
apiRoutes.route('/eblast', eblastRoutes)
apiRoutes.route('/webhooks', webhooksRoutes)
apiRoutes.route('/webhooks', stripeWebhookRoutes)

apiRoutes.use('*', authMiddleware)
// apiRoutes.use('*', checkUserOrganizationStatus)

const graphqlServer = createGraphQLServer()

apiRoutes.all('/graphql', async (c) => {
  const serverTiming = createGraphQLServerTiming()
  const response = await graphqlServer.handle(c.req.raw, { user: c.var.user, serverTiming })
  const serverTimingHeader = serverTiming.toHeader()

  if (!serverTimingHeader) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.append('Server-Timing', serverTimingHeader)

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
})

apiRoutes.route('/auth', authRoutes)
apiRoutes.route('/ws', websocketRoutes)
apiRoutes.route('/call', callWsRoutes)

apiRoutes.route('/checkout', checkoutRoutes)
apiRoutes.route('/onboarding', onboardingRoutes)
apiRoutes.route('/subscription', subscriptionRoutes)
apiRoutes.route('/users', userRoutes)
apiRoutes.route('/organizations', organizationRoutes)
apiRoutes.route('/organizations', organizationStatusRoutes)
apiRoutes.route('/organizations', legalDocumentRoutes)
apiRoutes.route('/members', membersRoutes)
apiRoutes.route('/invitations', invitationRoutes)
apiRoutes.route('/categories', categoryRoutes)
apiRoutes.route('/services', serviceRoutes)

apiRoutes.route('/activity', activityRoutes)
apiRoutes.route('/assistant', assistantRoutes)
apiRoutes.route('/app-shell', appShellRoutes)
apiRoutes.route('/favorites', favoriteRoutes)
apiRoutes.route('/requests', requestRoutes)
apiRoutes.route('/quotes', quoteRoutes)
apiRoutes.route('/invoices', invoiceRoutes)

apiRoutes.route('/conversations', conversationRoutes)
apiRoutes.route('/messages', messageRoutes)
apiRoutes.route('/', messageReadRoutes)
apiRoutes.route('/notifications', notificationRoutes)

apiRoutes.route('/documents', documentRoutes)
apiRoutes.route('/pdf', pdfRoutes)
apiRoutes.route('/calls', callsRoutes)
apiRoutes.route('/pricing-intelligence', pricingIntelligenceRoutes)
apiRoutes.route('/storage', storageRoutes)
apiRoutes.route('/metrics', metricsRoutes)

export default apiRoutes
