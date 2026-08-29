import type { PostmarkInboundPayload } from './application/webhook-models'
import { getWebhookUseCases } from './infrastructure/webhook-use-cases'

export class WebhooksApplicationService {
  async processPostmarkInbound(payload: PostmarkInboundPayload): Promise<void> {
    const useCases = await getWebhookUseCases()
    return await useCases.processPostmarkInbound.execute(payload)
  }

  async processStripeWebhook(input: { rawBody: string; signature: string }): Promise<void> {
    const useCases = await getWebhookUseCases()
    return await useCases.processStripeWebhook.execute(input)
  }
}

export const webhooksApplicationService = new WebhooksApplicationService()
