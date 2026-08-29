import { describe, expect, it } from 'bun:test'
import type Stripe from 'stripe'
import { toInvoiceSnapshot, toSubscriptionSnapshot } from '../stripe-subscription-webhook.mapper'

describe('Stripe subscription webhook mapper', () => {
  it('maps Stripe subscription updates to domain webhook snapshots', () => {
    const snapshot = toSubscriptionSnapshot({
      id: 'stripe-sub-1',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [
          {
            quantity: 3,
            current_period_end: 1_780_275_600,
          },
        ],
      },
    } as unknown as Stripe.Subscription)

    expect(snapshot).toEqual({
      stripeSubscriptionId: 'stripe-sub-1',
      status: 'active',
      seats: 3,
      periodEnd: new Date(1_780_275_600 * 1000),
      cancelAtPeriodEnd: false,
    })
  })

  it('maps invoice payment events using the parent subscription id fallback', () => {
    const snapshot = toInvoiceSnapshot({
      id: 'in_1',
      parent: {
        subscription_details: {
          subscription: { id: 'stripe-sub-1' },
        },
      },
    } as unknown as Stripe.Invoice)

    expect(snapshot).toEqual({
      invoiceId: 'in_1',
      stripeSubscriptionId: 'stripe-sub-1',
    })
  })
})
