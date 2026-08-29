import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripePaymentMethodPort } from '../application/ports'
import { type PaymentMethodCandidate, PaymentMethodError, type PaymentMethodInfo } from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

function wrapStripeError(error: unknown): never {
  if (error instanceof PaymentMethodError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error in payment method service:', error)
    throw new PaymentMethodError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function mapPaymentMethod(paymentMethod: Stripe.PaymentMethod): PaymentMethodInfo | null {
  if (paymentMethod.card) {
    return {
      type: 'card',
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    }
  }

  if (paymentMethod.sepa_debit) {
    return {
      type: 'sepa_debit',
      last4: paymentMethod.sepa_debit.last4 ?? '',
      bankCode: paymentMethod.sepa_debit.bank_code ?? null,
    }
  }

  return null
}

function mapPaymentMethodCandidate(paymentMethod: Stripe.PaymentMethod): PaymentMethodCandidate {
  return {
    id: paymentMethod.id,
    customerId: resolveCustomerId(paymentMethod.customer),
    info: mapPaymentMethod(paymentMethod),
  }
}

function resolveDefaultPaymentMethodId(
  customer: Stripe.Customer | Stripe.DeletedCustomer
): string | null {
  if ('deleted' in customer && customer.deleted) return null

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method
  if (typeof defaultPaymentMethod === 'string') return defaultPaymentMethod

  return defaultPaymentMethod?.id ?? null
}

export class StripePaymentMethodAdapter implements StripePaymentMethodPort {
  async getDefaultPaymentMethod(customerId: string): Promise<PaymentMethodInfo | null> {
    try {
      const customer = await stripeClient.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      })
      if ((customer as Stripe.DeletedCustomer).deleted) return null

      const customerDefaultPaymentMethod = (customer as Stripe.Customer).invoice_settings
        ?.default_payment_method
      if (!customerDefaultPaymentMethod || typeof customerDefaultPaymentMethod === 'string') {
        return null
      }

      return mapPaymentMethod(customerDefaultPaymentMethod)
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async createSetupIntent(input: {
    customerId: string
    organizationId: string
    subscriptionId: string | null
  }): Promise<string | null> {
    try {
      const setupIntent = await stripeClient.setupIntents.create({
        customer: input.customerId,
        payment_method_types: ['card', 'sepa_debit'],
        usage: 'off_session',
        metadata: {
          organizationId: input.organizationId,
          subscriptionId: input.subscriptionId ?? '',
        },
      })

      return setupIntent.client_secret ?? null
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async retrievePaymentMethod(paymentMethodId: string): Promise<PaymentMethodCandidate | null> {
    try {
      const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId)
      return mapPaymentMethodCandidate(paymentMethod)
    } catch {
      return null
    }
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<void> {
    try {
      await stripeClient.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      })
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async setCustomerDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<string | null> {
    try {
      const previousCustomer = await stripeClient.customers.retrieve(customerId)
      const previousPaymentMethodId = resolveDefaultPaymentMethodId(previousCustomer)

      await stripeClient.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })

      return previousPaymentMethodId
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async setSubscriptionDefaultPaymentMethod(
    stripeSubscriptionId: string,
    paymentMethodId: string
  ): Promise<void> {
    try {
      await stripeClient.subscriptions.update(stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      })
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async retryLatestOpenInvoice(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      const invoices = await stripeClient.invoices.list({
        customer: customerId,
        status: 'open',
        limit: 1,
      })
      const latest = invoices.data[0]
      if (!latest?.id) return

      await stripeClient.invoices.pay(latest.id, {
        payment_method: paymentMethodId,
      })
    } catch (error) {
      console.error('[payment-method] retry of latest open invoice failed', error)
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await stripeClient.paymentMethods.detach(paymentMethodId)
    } catch (error) {
      console.warn('Could not detach previous payment method', error)
    }
  }
}
