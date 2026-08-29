import { Hono } from 'hono'
import { createApiErrorResponse, ErrorCode } from '../../../infrastructure/types/api.types'
import { InvalidStripeWebhookSignatureError } from '../application/webhook-use-cases'
import { webhooksApplicationService } from '../webhooks.application'

const stripeWebhook = new Hono()

stripeWebhook.post('/stripe', async (c) => {
  const signature = c.req.header('Stripe-Signature')
  if (!signature) {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid signature'), 400)
  }

  const rawBody = await c.req.text()

  try {
    await webhooksApplicationService.processStripeWebhook({ rawBody, signature })
  } catch (error) {
    if (error instanceof InvalidStripeWebhookSignatureError) {
      return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid signature'), 400)
    }
    throw error
  }

  return c.json({ received: true }, 200)
})

export default stripeWebhook
