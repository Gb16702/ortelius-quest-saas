import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionSeatPort } from '../application/ports'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

export class StripeSubscriptionSeatAdapter implements StripeSubscriptionSeatPort {
  async getFirstSubscriptionItemId(stripeSubscriptionId: string): Promise<string> {
    const stripeSubscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data'],
    })
    const subscriptionItem = stripeSubscription.items.data[0]

    if (!subscriptionItem) {
      throw new Error('No subscription item found')
    }

    return subscriptionItem.id
  }

  async updateSubscriptionItemQuantity(
    subscriptionItemId: string,
    quantity: number
  ): Promise<void> {
    await stripeClient.subscriptionItems.update(subscriptionItemId, {
      quantity,
      proration_behavior: 'create_prorations',
    })
  }
}
