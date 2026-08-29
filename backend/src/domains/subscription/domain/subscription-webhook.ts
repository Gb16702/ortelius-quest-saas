export type StripeWebhookSubscriptionSnapshot = {
  stripeSubscriptionId: string
  status: string
  seats: number
  periodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export type StripeWebhookInvoiceSnapshot = {
  invoiceId: string
  stripeSubscriptionId: string | null
}

export type SubscriptionWebhookRecord = {
  id: string
  status: string
}

export type WebhookHandlingResult =
  | { handled: true; warning?: never }
  | { handled: false; warning: string }

export function handledWebhook(): WebhookHandlingResult {
  return { handled: true }
}

export function skippedWebhook(warning: string): WebhookHandlingResult {
  return { handled: false, warning }
}

export function shouldReactivateAfterSuccessfulPayment(
  subscription: SubscriptionWebhookRecord
): boolean {
  return subscription.status === 'past_due'
}
