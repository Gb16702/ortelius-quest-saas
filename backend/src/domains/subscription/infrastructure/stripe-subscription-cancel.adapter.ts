import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionCancellationPort } from '../application/ports'
import { CancelSubscriptionError } from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

function wrapStripeError(error: unknown): never {
  if (error instanceof CancelSubscriptionError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error during cancel/resume:', error)
    throw new CancelSubscriptionError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

export class StripeSubscriptionCancelAdapter implements StripeSubscriptionCancellationPort {
  async scheduleCancelAtPeriodEnd(
    stripeSubscriptionId: string
  ): Promise<{ periodEnd: Date | null }> {
    try {
      const updatedStripe = await stripeClient.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      const periodEndEpoch =
        (updatedStripe as unknown as { current_period_end?: number | null }).current_period_end ??
        (
          updatedStripe.items.data[0] as unknown as {
            current_period_end?: number | null
          }
        )?.current_period_end ??
        null

      return {
        periodEnd: periodEndEpoch ? new Date(periodEndEpoch * 1000) : null,
      }
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async resume(stripeSubscriptionId: string): Promise<void> {
    try {
      await stripeClient.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      })
    } catch (error) {
      wrapStripeError(error)
    }
  }
}
