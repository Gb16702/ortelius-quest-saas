import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionCurrentPort } from '../application/ports'
import { getPlanDisplayName, type PendingPlanChange } from '../domain'
import type { SubscriptionCurrentPriceSnapshot } from '../domain/subscription-current'
import { EnvSubscriptionPricingAdapter } from './env-subscription-pricing.adapter'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

function extractPendingPlanChange(
  schedule: Stripe.Subscription['schedule']
): PendingPlanChange | null {
  if (!schedule || typeof schedule === 'string') return null
  if (schedule.status !== 'active' && schedule.status !== 'not_started') {
    return null
  }

  const phases = schedule.phases ?? []
  if (phases.length < 2) return null

  const nextPhase = phases[1]
  const nextItem = nextPhase.items?.[0]
  if (!nextItem) return null

  const priceId = typeof nextItem.price === 'string' ? nextItem.price : nextItem.price.id
  const targetPlan = new EnvSubscriptionPricingAdapter().resolvePlanPrice(priceId)
  if (!targetPlan) return null

  return {
    newPlan: getPlanDisplayName(targetPlan.key),
    newPlanKey: targetPlan.key,
    newPriceId: priceId,
    billingInterval: targetPlan.interval,
    effectiveAt: new Date(nextPhase.start_date * 1000).toISOString().slice(0, 10),
  }
}

export class StripeSubscriptionCurrentAdapter implements StripeSubscriptionCurrentPort {
  async getPriceSnapshot(stripeSubscriptionId: string): Promise<SubscriptionCurrentPriceSnapshot> {
    const stripeSubscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['schedule'],
    })
    const subscriptionItem = stripeSubscription.items.data[0]

    let pricePerSeat = 0
    let totalMonthlyPrice = 0
    let currentPriceId: string | null = null

    if (subscriptionItem?.price?.unit_amount) {
      pricePerSeat = subscriptionItem.price.unit_amount / 100
      const quantity = subscriptionItem.quantity || 1
      totalMonthlyPrice = pricePerSeat * quantity
      currentPriceId = subscriptionItem.price.id
    }

    return {
      pricePerSeat,
      totalMonthlyPrice,
      currentPriceId,
      pendingPlanChange: extractPendingPlanChange(stripeSubscription.schedule),
    }
  }
}
