import { SubscriptionWebhookUseCase } from '../application/subscription-webhook.use-cases'

export interface SubscriptionWebhookUseCaseContainer {
  webhooks: SubscriptionWebhookUseCase
}

let subscriptionWebhookUseCases: SubscriptionWebhookUseCaseContainer | null = null

export async function getSubscriptionWebhookUseCases(): Promise<SubscriptionWebhookUseCaseContainer> {
  if (subscriptionWebhookUseCases) return subscriptionWebhookUseCases

  const { DrizzleSubscriptionWebhookRepository } = await import('./subscription-webhook.repository')

  subscriptionWebhookUseCases = {
    webhooks: new SubscriptionWebhookUseCase(new DrizzleSubscriptionWebhookRepository()),
  }

  return subscriptionWebhookUseCases
}
