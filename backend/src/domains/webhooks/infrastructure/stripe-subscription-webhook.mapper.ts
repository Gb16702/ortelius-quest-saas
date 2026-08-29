import type Stripe from 'stripe'
import type {
  StripeWebhookInvoiceSnapshot,
  StripeWebhookSubscriptionSnapshot,
} from '../application/webhook-models'

interface SubscriptionWithLegacyFields {
  current_period_end?: number | null
}

interface SubscriptionItemWithLegacyFields {
  current_period_end?: number | null
}

interface InvoiceWithLegacyFields {
  subscription?: string | { id: string } | null
  parent?: {
    subscription_details?: {
      subscription?: string | { id: string } | null
    } | null
  } | null
}

function resolvePeriodEndEpoch(stripeSub: Stripe.Subscription): number | null {
  const subShim = stripeSub as unknown as SubscriptionWithLegacyFields
  if (typeof subShim.current_period_end === 'number') {
    return subShim.current_period_end
  }

  const item = stripeSub.items.data[0] as unknown as SubscriptionItemWithLegacyFields | undefined
  if (item && typeof item.current_period_end === 'number') {
    return item.current_period_end
  }

  return null
}

function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const shim = invoice as unknown as InvoiceWithLegacyFields

  const direct = shim.subscription
  if (typeof direct === 'string') return direct
  if (direct && typeof direct === 'object' && 'id' in direct) return direct.id

  const fromParent = shim.parent?.subscription_details?.subscription
  if (typeof fromParent === 'string') return fromParent
  if (fromParent && typeof fromParent === 'object' && 'id' in fromParent) {
    return fromParent.id
  }

  return null
}

export function toSubscriptionSnapshot(
  stripeSub: Stripe.Subscription
): StripeWebhookSubscriptionSnapshot {
  const periodEndEpoch = resolvePeriodEndEpoch(stripeSub)

  return {
    stripeSubscriptionId: stripeSub.id,
    status: stripeSub.status,
    seats: stripeSub.items.data[0]?.quantity ?? 1,
    periodEnd: periodEndEpoch ? new Date(periodEndEpoch * 1000) : null,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
  }
}

export function toInvoiceSnapshot(invoice: Stripe.Invoice): StripeWebhookInvoiceSnapshot {
  return {
    invoiceId: invoice.id ?? 'unknown',
    stripeSubscriptionId: resolveInvoiceSubscriptionId(invoice),
  }
}
