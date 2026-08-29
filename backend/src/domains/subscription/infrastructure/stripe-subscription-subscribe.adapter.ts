import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionSubscribePort } from '../application/ports'
import { type StripeSubscribeSubscriptionSnapshot, SubscribeError } from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

type StripeInvoiceWithConfirmationSecret = Stripe.Invoice & {
  confirmation_secret?: { client_secret?: string | null; type?: string | null } | null
}

type StripeSubscriptionPeriodFields = {
  current_period_start?: number | null
  current_period_end?: number | null
  trial_start?: number | null
  trial_end?: number | null
}

function wrapStripeError(error: unknown): never {
  if (error instanceof SubscribeError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error during subscribe:', error)
    throw new SubscribeError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string {
  if (typeof customer === 'string') return customer
  return customer?.id ?? ''
}

function fromEpoch(epoch: number | null | undefined): Date | null {
  return epoch ? new Date(epoch * 1000) : null
}

function resolveConfirmationSecret(invoice: string | Stripe.Invoice | null): string | null {
  if (!invoice || typeof invoice === 'string') return null
  const expandedInvoice = invoice as StripeInvoiceWithConfirmationSecret
  return expandedInvoice.confirmation_secret?.client_secret ?? null
}

function mapStripeSubscription(
  stripeSubscription: Stripe.Subscription
): StripeSubscribeSubscriptionSnapshot {
  const item = stripeSubscription.items.data[0]
  const subscriptionPeriods = stripeSubscription as Stripe.Subscription &
    StripeSubscriptionPeriodFields
  const itemPeriods = item as Stripe.SubscriptionItem & StripeSubscriptionPeriodFields

  return {
    id: stripeSubscription.id,
    status: stripeSubscription.status,
    customerId: resolveCustomerId(stripeSubscription.customer),
    organizationId: stripeSubscription.metadata?.organizationId ?? null,
    priceId: item?.price.id ?? '',
    quantity: item?.quantity ?? 1,
    clientSecret: resolveConfirmationSecret(stripeSubscription.latest_invoice),
    periodStart: fromEpoch(
      subscriptionPeriods.current_period_start ?? itemPeriods?.current_period_start
    ),
    periodEnd: fromEpoch(subscriptionPeriods.current_period_end ?? itemPeriods?.current_period_end),
    trialStart: fromEpoch(subscriptionPeriods.trial_start),
    trialEnd: fromEpoch(subscriptionPeriods.trial_end),
  }
}

export class StripeSubscriptionSubscribeAdapter implements StripeSubscriptionSubscribePort {
  async createSubscription(input: {
    customerId: string
    organizationId: string
    userId: string
    priceId: string
  }): Promise<StripeSubscribeSubscriptionSnapshot> {
    try {
      const stripeSubscription = await stripeClient.subscriptions.create({
        customer: input.customerId,
        items: [{ price: input.priceId, quantity: 1 }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card', 'sepa_debit'],
        },
        proration_behavior: 'create_prorations',
        expand: ['latest_invoice.confirmation_secret'],
        metadata: {
          organizationId: input.organizationId,
          userId: input.userId,
          billingModel: 'per-seat',
        },
      })

      return mapStripeSubscription(stripeSubscription)
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async retrieveSubscription(subscriptionId: string): Promise<StripeSubscribeSubscriptionSnapshot> {
    try {
      const stripeSubscription = await stripeClient.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data', 'customer'],
      })

      return mapStripeSubscription(stripeSubscription)
    } catch (error) {
      wrapStripeError(error)
    }
  }
}
