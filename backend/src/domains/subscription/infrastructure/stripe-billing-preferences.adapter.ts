import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { BillingPreferencesPort } from '../application/ports'
import {
  type BillingAddress,
  BillingAddressError,
  findSupportedInvoiceLanguage,
  InvoiceEmailError,
  type InvoiceLanguage,
  InvoiceLanguageError,
} from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

function wrapInvoiceEmailStripeError(error: unknown): never {
  if (error instanceof InvoiceEmailError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error in invoice email service:', error)
    throw new InvoiceEmailError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

function wrapInvoiceLanguageStripeError(error: unknown): never {
  if (error instanceof InvoiceLanguageError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error in invoice language service:', error)
    throw new InvoiceLanguageError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

function wrapBillingAddressStripeError(error: unknown): never {
  if (error instanceof BillingAddressError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error in billing address service:', error)
    throw new BillingAddressError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

function mapStripeAddress(
  address: Stripe.Address | null | undefined,
  fallback?: BillingAddress
): BillingAddress | null {
  if (!address) return null

  const country = address.country ?? fallback?.country
  const line1 = address.line1 ?? fallback?.line1

  if (!country || !line1) return null

  return {
    country,
    line1,
    line2: address.line2 ?? null,
    city: address.city ?? fallback?.city ?? '',
    postalCode: address.postal_code ?? fallback?.postalCode ?? '',
    state: address.state ?? null,
  }
}

export class StripeBillingPreferencesAdapter implements BillingPreferencesPort {
  async getInvoiceEmail(customerId: string): Promise<string | null> {
    try {
      const customer = await stripeClient.customers.retrieve(customerId)
      if ((customer as Stripe.DeletedCustomer).deleted) return null

      return (customer as Stripe.Customer).email ?? null
    } catch (error) {
      wrapInvoiceEmailStripeError(error)
    }
  }

  async updateInvoiceEmail(customerId: string, email: string): Promise<string | null> {
    try {
      const updated = await stripeClient.customers.update(customerId, { email })
      return updated.email ?? null
    } catch (error) {
      wrapInvoiceEmailStripeError(error)
    }
  }

  async getInvoiceLanguage(customerId: string): Promise<InvoiceLanguage | null> {
    try {
      const customer = await stripeClient.customers.retrieve(customerId)
      if ((customer as Stripe.DeletedCustomer).deleted) return null

      return findSupportedInvoiceLanguage((customer as Stripe.Customer).preferred_locales ?? [])
    } catch (error) {
      wrapInvoiceLanguageStripeError(error)
    }
  }

  async updateInvoiceLanguage(customerId: string, language: InvoiceLanguage): Promise<void> {
    try {
      await stripeClient.customers.update(customerId, {
        preferred_locales: [language],
      })
    } catch (error) {
      wrapInvoiceLanguageStripeError(error)
    }
  }

  async getBillingAddress(customerId: string): Promise<BillingAddress | null> {
    try {
      const customer = await stripeClient.customers.retrieve(customerId)
      if ((customer as Stripe.DeletedCustomer).deleted) return null

      return mapStripeAddress((customer as Stripe.Customer).address)
    } catch (error) {
      wrapBillingAddressStripeError(error)
    }
  }

  async updateBillingAddress(input: {
    customerId: string
    address: BillingAddress
    name: string | null
  }): Promise<BillingAddress | null> {
    try {
      const updatePayload: Stripe.CustomerUpdateParams = {
        address: {
          country: input.address.country,
          line1: input.address.line1,
          line2: input.address.line2 ?? undefined,
          city: input.address.city,
          postal_code: input.address.postalCode,
          state: input.address.state ?? undefined,
        },
      }

      if (input.name) {
        updatePayload.name = input.name
      }

      const updated = await stripeClient.customers.update(input.customerId, updatePayload)

      return mapStripeAddress(updated.address, input.address)
    } catch (error) {
      wrapBillingAddressStripeError(error)
    }
  }
}
