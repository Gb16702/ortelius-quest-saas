import { Hono } from 'hono'
import { validateJson } from '../../../infrastructure/validation/validation.utils'
import { webhooksApplicationService } from '../webhooks.application'
import { postmarkInboundSchema } from './webhooks.schemas'

const webhooks = new Hono()

webhooks.post('/postmark/inbound', validateJson(postmarkInboundSchema), async (c) => {
  try {
    const payload = c.req.valid('json')
    await webhooksApplicationService.processPostmarkInbound(payload)
    return c.json({ success: true }, 200)
  } catch (error) {
    console.error('[Webhook] Error processing inbound email:', error)
    return c.json({ success: true }, 200)
  }
})

export default webhooks
