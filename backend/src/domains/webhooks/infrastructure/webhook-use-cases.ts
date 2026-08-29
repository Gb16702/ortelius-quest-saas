import type {
  PostmarkInboundUseCaseDependencies,
  StripeWebhookUseCaseDependencies,
} from '../application/ports'
import {
  ProcessPostmarkInboundUseCase,
  ProcessStripeWebhookUseCase,
} from '../application/webhook-use-cases'
import { AIExtractionService } from './ai-extraction.adapter'
import { ApplicationExtractionContextAdapter } from './extraction-context.adapter'
import {
  StripeWebhookVerifierAdapter,
  SubscriptionApplicationWebhookAdapter,
} from './stripe-webhook.adapter'
import { DrizzleWebhookRepository } from './webhook.repository'
import { NanoidWebhookIdAdapter, SystemWebhookClockAdapter } from './webhook-system.adapter'

export interface WebhookUseCaseContainer {
  processPostmarkInbound: ProcessPostmarkInboundUseCase
  processStripeWebhook: ProcessStripeWebhookUseCase
}

let webhookUseCases: WebhookUseCaseContainer | null = null

export async function getWebhookUseCases(): Promise<WebhookUseCaseContainer> {
  if (webhookUseCases) return webhookUseCases

  const repository = new DrizzleWebhookRepository()
  const postmarkDeps: PostmarkInboundUseCaseDependencies = {
    organizations: repository,
    requests: repository,
    extractionContext: new ApplicationExtractionContextAdapter(),
    emailExtraction: new AIExtractionService(),
    ids: new NanoidWebhookIdAdapter(),
    clock: new SystemWebhookClockAdapter(),
  }
  const stripeDeps: StripeWebhookUseCaseDependencies = {
    verifier: new StripeWebhookVerifierAdapter(),
    subscriptions: new SubscriptionApplicationWebhookAdapter(),
  }

  webhookUseCases = {
    processPostmarkInbound: new ProcessPostmarkInboundUseCase(postmarkDeps),
    processStripeWebhook: new ProcessStripeWebhookUseCase(stripeDeps),
  }

  return webhookUseCases
}
