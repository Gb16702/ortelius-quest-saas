import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import { db } from '../../../infrastructure/database'
import { organization } from '../../../infrastructure/database/db/schemas/auth-schema'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

export class SubscriptionCustomerRegistryError extends Error {
  constructor(
    public code: 'ORGANIZATION_NOT_FOUND' | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export interface EnsureSubscriptionCustomerInput {
  organizationId: string
  ownerEmail?: string
}

class StripeOrganizationCustomerRegistry {
  async ensure(input: EnsureSubscriptionCustomerInput): Promise<string> {
    try {
      return await this.runEnsure(input)
    } catch (error) {
      if (error instanceof SubscriptionCustomerRegistryError) throw error
      if (error instanceof Stripe.errors.StripeError) {
        console.error('Stripe error in subscription customer registry:', error)
        throw new SubscriptionCustomerRegistryError(
          'STRIPE_UNAVAILABLE',
          "We couldn't reach our billing provider. Please try again in a moment."
        )
      }
      throw error
    }
  }

  async get(organizationId: string): Promise<string | null> {
    const rows = await db
      .select({ stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0]?.stripeCustomerId ?? null
  }

  private async runEnsure(input: EnsureSubscriptionCustomerInput): Promise<string> {
    const orgRow = await db
      .select({
        id: organization.id,
        name: organization.name,
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .limit(1)

    if (orgRow.length === 0) {
      throw new SubscriptionCustomerRegistryError(
        'ORGANIZATION_NOT_FOUND',
        'Organization not found.'
      )
    }

    const org = orgRow[0]

    if (org.stripeCustomerId) {
      const validated = await this.validateExisting(org.stripeCustomerId)
      if (validated) return validated
    }

    const created = await stripeClient.customers.create({
      name: org.name,
      email: input.ownerEmail,
      metadata: {
        organizationId: org.id,
      },
    })

    await db
      .update(organization)
      .set({ stripeCustomerId: created.id })
      .where(eq(organization.id, org.id))

    return created.id
  }

  private async validateExisting(customerId: string): Promise<string | null> {
    try {
      const existing = await stripeClient.customers.retrieve(customerId)
      if ((existing as Stripe.DeletedCustomer).deleted) return null
      return customerId
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        return null
      }
      throw error
    }
  }
}

export const stripeOrganizationCustomerRegistry = new StripeOrganizationCustomerRegistry()
