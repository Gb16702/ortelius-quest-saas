import {
  handledWebhook,
  type StripeWebhookInvoiceSnapshot,
  type StripeWebhookSubscriptionSnapshot,
  shouldReactivateAfterSuccessfulPayment,
  skippedWebhook,
  type WebhookHandlingResult,
} from '../domain'
import type { SubscriptionWebhookRepositoryPort } from './ports'

export class SubscriptionWebhookUseCase {
  constructor(private readonly subscriptions: SubscriptionWebhookRepositoryPort) {}

  async handleSubscriptionUpdated(
    snapshot: StripeWebhookSubscriptionSnapshot
  ): Promise<WebhookHandlingResult> {
    const existing = await this.subscriptions.findByStripeSubscriptionId(
      snapshot.stripeSubscriptionId
    )
    if (!existing) {
      return skippedWebhook(
        `[StripeWebhook] subscription.updated: no DB row for stripeSubscriptionId=${snapshot.stripeSubscriptionId}`
      )
    }

    await this.subscriptions.updateFromStripeSubscription(snapshot)
    return handledWebhook()
  }

  async handleSubscriptionDeleted(snapshot: {
    stripeSubscriptionId: string
  }): Promise<WebhookHandlingResult> {
    const existing = await this.subscriptions.findByStripeSubscriptionId(
      snapshot.stripeSubscriptionId
    )
    if (!existing) {
      return skippedWebhook(
        `[StripeWebhook] subscription.deleted: no DB row for stripeSubscriptionId=${snapshot.stripeSubscriptionId}`
      )
    }

    await this.subscriptions.markCanceled(snapshot.stripeSubscriptionId)
    return handledWebhook()
  }

  async handleInvoicePaymentFailed(
    snapshot: StripeWebhookInvoiceSnapshot
  ): Promise<WebhookHandlingResult> {
    if (!snapshot.stripeSubscriptionId) {
      return skippedWebhook(
        `[StripeWebhook] invoice.payment_failed: no subscription on invoice id=${snapshot.invoiceId}`
      )
    }

    const existing = await this.subscriptions.findByStripeSubscriptionId(
      snapshot.stripeSubscriptionId
    )
    if (!existing) {
      return skippedWebhook(
        `[StripeWebhook] invoice.payment_failed: no DB row for stripeSubscriptionId=${snapshot.stripeSubscriptionId}`
      )
    }

    await this.subscriptions.markPastDue(snapshot.stripeSubscriptionId)
    return handledWebhook()
  }

  async handleInvoicePaymentSucceeded(
    snapshot: StripeWebhookInvoiceSnapshot
  ): Promise<WebhookHandlingResult> {
    if (!snapshot.stripeSubscriptionId) {
      return skippedWebhook(
        `[StripeWebhook] invoice.payment_succeeded: no subscription on invoice id=${snapshot.invoiceId}`
      )
    }

    const existing = await this.subscriptions.findByStripeSubscriptionId(
      snapshot.stripeSubscriptionId
    )
    if (!existing) {
      return skippedWebhook(
        `[StripeWebhook] invoice.payment_succeeded: no DB row for stripeSubscriptionId=${snapshot.stripeSubscriptionId}`
      )
    }

    if (!shouldReactivateAfterSuccessfulPayment(existing)) {
      return handledWebhook()
    }

    await this.subscriptions.markActive(snapshot.stripeSubscriptionId)
    return handledWebhook()
  }
}
