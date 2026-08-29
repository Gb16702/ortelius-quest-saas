import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type {
  CheckoutConfirmedSubscription,
  CheckoutCreatedSubscription,
  CreateSubscriptionResult,
  StartFreeTrialInput,
} from '../application/checkout-models'
import type { CheckoutBillingPort } from '../application/ports'

type StripeSubscription = Stripe.Subscription & {
  current_period_start?: number
  current_period_end?: number
}

type ExpandedInvoice = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null
}

type StripeSubscriptionWithTrial = StripeSubscription & {
  trial_start?: number | null
  trial_end?: number | null
}

export class StripeCheckoutBillingAdapter implements CheckoutBillingPort {
  private readonly stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  })

  async createSubscription(input: {
    customerEmail: string
    customerName: string
    organizationName: string
    organizationSlug?: string
    plan: string
    priceId: string
    initialSeats: number
    trialDays: number
  }): Promise<CreateSubscriptionResult> {
    const customer = await this.stripeClient.customers.create({
      email: input.customerEmail,
      name: input.customerName,
      metadata: {
        organizationName: input.organizationName,
        ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
        plan: input.plan,
      },
    })

    if (input.trialDays > 0) {
      const subscription = await this.stripeClient.subscriptions.create({
        customer: customer.id,
        items: [{ price: input.priceId, quantity: input.initialSeats }],
        trial_period_days: input.trialDays,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card', 'sepa_debit'],
        },
        proration_behavior: 'create_prorations',
        expand: ['pending_setup_intent'],
        metadata: {
          organizationName: input.organizationName,
          ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
          plan: input.plan,
          billingModel: 'per-seat',
        },
      })

      const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent

      if (!setupIntent?.client_secret) {
        throw new Error('Failed to create setup intent for trial')
      }

      return {
        clientSecret: setupIntent.client_secret,
        subscriptionId: subscription.id,
        customerId: customer.id,
        type: 'setup',
      }
    }

    const subscription = await this.stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: input.priceId, quantity: input.initialSeats }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card', 'sepa_debit'],
      },
      proration_behavior: 'create_prorations',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        organizationName: input.organizationName,
        ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
        plan: input.plan,
        billingModel: 'per-seat',
      },
    })

    if (typeof subscription.latest_invoice === 'string' || !subscription.latest_invoice) {
      throw new Error('Failed to expand latest invoice')
    }

    const invoice = subscription.latest_invoice as ExpandedInvoice
    const paymentIntentRaw = invoice.payment_intent

    if (typeof paymentIntentRaw === 'string' || !paymentIntentRaw) {
      throw new Error('Failed to expand payment intent')
    }

    const paymentIntent = paymentIntentRaw as Stripe.PaymentIntent

    console.log('Stripe subscription created:', {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      invoiceId: invoice?.id,
      invoiceStatus: invoice?.status,
      invoiceTotal: invoice?.total,
      paymentIntentId: paymentIntent?.id,
      paymentIntentStatus: paymentIntent?.status,
    })

    if (!paymentIntent?.client_secret) {
      throw new Error('Failed to create payment intent')
    }

    return {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
      customerId: customer.id,
      type: 'payment',
    }
  }

  async retrieveSubscription(subscriptionId: string): Promise<CheckoutConfirmedSubscription> {
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(subscriptionId)

    return {
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      customerId: stripeSubscription.customer,
    }
  }

  async createCardlessTrialSubscription(
    input: StartFreeTrialInput & { priceId: string; trialDays: number }
  ): Promise<CheckoutCreatedSubscription> {
    const customer = await this.stripeClient.customers.create({
      email: input.email,
      name: input.fullName,
      metadata: {
        organizationName: input.organizationName,
        ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
        plan: input.plan,
        userId: input.userId,
      },
    })

    const stripeSubscription = await this.stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: input.priceId, quantity: 1 }],
      trial_period_days: input.trialDays,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      },
      metadata: {
        organizationName: input.organizationName,
        ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
        plan: input.plan,
        userId: input.userId,
        billingModel: 'per-seat',
      },
    })

    return this.toCheckoutSubscription(stripeSubscription, customer.id)
  }

  async retrieveCheckoutSubscription(subscriptionId: string): Promise<CheckoutCreatedSubscription> {
    const stripeSubscription = (await this.stripeClient.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data'],
    })) as StripeSubscription

    return this.toCheckoutSubscription(stripeSubscription, stripeSubscription.customer as string)
  }

  async updateCustomerMetadata(
    customerId: string,
    metadata: Record<string, string>
  ): Promise<void> {
    await this.stripeClient.customers.update(customerId, { metadata })
  }

  async updateSubscriptionMetadata(
    subscriptionId: string,
    metadata: Record<string, string>
  ): Promise<void> {
    await this.stripeClient.subscriptions.update(subscriptionId, { metadata })
  }

  private toCheckoutSubscription(
    stripeSubscription: StripeSubscription,
    customerId: string
  ): CheckoutCreatedSubscription {
    const subscriptionItem = stripeSubscription.items?.data?.[0] as
      | (Stripe.SubscriptionItem & {
          current_period_start?: number | null
          current_period_end?: number | null
        })
      | undefined
    const subscriptionWithTrial = stripeSubscription as StripeSubscriptionWithTrial

    return {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      metadata: { ...stripeSubscription.metadata },
      currentPeriodStart: stripeSubscription.current_period_start,
      currentPeriodEnd: stripeSubscription.current_period_end,
      trialStart: subscriptionWithTrial.trial_start,
      trialEnd: subscriptionWithTrial.trial_end,
      customerId,
      firstItemQuantity: subscriptionItem?.quantity,
      firstItemCurrentPeriodStart: subscriptionItem?.current_period_start,
      firstItemCurrentPeriodEnd: subscriptionItem?.current_period_end,
    }
  }
}
