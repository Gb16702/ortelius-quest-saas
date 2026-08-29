import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionPortalPort } from '../application/ports'
import type { SubscriptionPortalSessionResult } from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

export class StripeSubscriptionPortalAdapter implements StripeSubscriptionPortalPort {
  async createBillingPortalSession(input: {
    customerId: string
    organizationSlug: string | null | undefined
  }): Promise<SubscriptionPortalSessionResult> {
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: `${env.FRONTEND_URL}/org/${input.organizationSlug}/settings/billing`,
    })

    return { url: portalSession.url }
  }
}
