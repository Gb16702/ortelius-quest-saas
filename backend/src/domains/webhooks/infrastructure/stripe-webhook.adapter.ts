import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import { subscriptionApplicationService } from '../../subscription/subscription.application'
import type { StripeWebhookVerifierPort, SubscriptionWebhookPort } from '../application/ports'
import type {
  StripeWebhookEvent,
  StripeWebhookInvoiceSnapshot,
  StripeWebhookSubscriptionSnapshot,
} from '../application/webhook-models'
import { toInvoiceSnapshot, toSubscriptionSnapshot } from './stripe-subscription-webhook.mapper'

export class StripeWebhookVerifierAdapter implements StripeWebhookVerifierPort {
  private readonly stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  })

  async constructEvent(rawBody: string, signature: string): Promise<StripeWebhookEvent> {
    const event = await this.stripeClient.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
      case 'customer.subscription.updated':
        return {
          id: event.id,
          type: event.type,
          subscription: toSubscriptionSnapshot(event.data.object as Stripe.Subscription),
        }
      case 'customer.subscription.deleted':
        return {
          id: event.id,
          type: event.type,
          stripeSubscriptionId: (event.data.object as Stripe.Subscription).id,
        }
      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded':
        return {
          id: event.id,
          type: event.type,
          invoice: toInvoiceSnapshot(event.data.object as Stripe.Invoice),
        }
      default:
        return { id: event.id, type: event.type }
    }
  }
}

export class SubscriptionApplicationWebhookAdapter implements SubscriptionWebhookPort {
  async handleSubscriptionUpdated(snapshot: StripeWebhookSubscriptionSnapshot): Promise<void> {
    await subscriptionApplicationService.handleSubscriptionUpdated(snapshot)
  }

  async handleSubscriptionDeleted(input: { stripeSubscriptionId: string }): Promise<void> {
    await subscriptionApplicationService.handleSubscriptionDeleted(input)
  }

  async handleInvoicePaymentFailed(snapshot: StripeWebhookInvoiceSnapshot): Promise<void> {
    await subscriptionApplicationService.handleInvoicePaymentFailed(snapshot)
  }

  async handleInvoicePaymentSucceeded(snapshot: StripeWebhookInvoiceSnapshot): Promise<void> {
    await subscriptionApplicationService.handleInvoicePaymentSucceeded(snapshot)
  }
}
