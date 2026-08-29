import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionPlanChangePort } from '../application/ports'
import {
  type PaymentMethodCard,
  PlanChangeError,
  type StripePlanChangePreview,
  type StripePlanChangeSubscriptionSnapshot,
} from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

type StripeSubscriptionPeriodFields = {
  current_period_end?: number | null
}

type StripeSubscriptionItemPeriodFields = {
  current_period_end?: number | null
}

function wrapStripeError(error: unknown): never {
  if (error instanceof PlanChangeError) throw error
  if (error instanceof Stripe.errors.StripeError) {
    console.error('Stripe error during plan change:', error)
    throw new PlanChangeError(
      'STRIPE_UNAVAILABLE',
      "We couldn't reach our billing provider. Please try again in a moment."
    )
  }
  throw error
}

function isoDateFromEpoch(epoch: number): string {
  return new Date(epoch * 1000).toISOString().slice(0, 10)
}

function resolveNextBillingDate(
  stripeSubscription: Stripe.Subscription,
  currentItem: Stripe.SubscriptionItem | undefined
): string {
  const subscriptionPeriods = stripeSubscription as Stripe.Subscription &
    StripeSubscriptionPeriodFields
  const itemPeriods = currentItem as
    | (Stripe.SubscriptionItem & StripeSubscriptionItemPeriodFields)
    | undefined
  const periodEndEpoch =
    subscriptionPeriods.current_period_end ?? itemPeriods?.current_period_end ?? null

  return periodEndEpoch ? isoDateFromEpoch(periodEndEpoch) : new Date().toISOString().slice(0, 10)
}

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string {
  if (typeof customer === 'string') return customer
  return customer?.id ?? ''
}

function resolveScheduleId(schedule: Stripe.Subscription['schedule']): string | null {
  if (!schedule) return null
  return typeof schedule === 'string' ? schedule : schedule.id
}

function mapCardPaymentMethod(paymentMethod: Stripe.PaymentMethod): PaymentMethodCard | null {
  if (!paymentMethod.card) return null

  return {
    type: 'card',
    brand: paymentMethod.card.brand,
    last4: paymentMethod.card.last4,
    expMonth: paymentMethod.card.exp_month,
    expYear: paymentMethod.card.exp_year,
  }
}

function computeAdjustment(preview: Stripe.Invoice): number {
  const lines = preview.lines?.data ?? []
  const creditMinorUnits = lines
    .filter((line) => (line.amount ?? 0) < 0)
    .reduce((sum, line) => sum + (line.amount ?? 0), 0)

  return creditMinorUnits / 100
}

function computeProratedNewCharge(preview: Stripe.Invoice): number {
  const lines = preview.lines?.data ?? []
  const chargeMinorUnits = lines
    .filter((line) => (line.amount ?? 0) > 0)
    .reduce((sum, line) => sum + (line.amount ?? 0), 0)

  return chargeMinorUnits / 100
}

export class StripeSubscriptionPlanChangeAdapter implements StripeSubscriptionPlanChangePort {
  async retrieveSubscription(
    stripeSubscriptionId: string
  ): Promise<StripePlanChangeSubscriptionSnapshot> {
    try {
      const stripeSubscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId, {
        expand: ['items.data', 'customer', 'default_payment_method', 'schedule'],
      })
      const currentItem = stripeSubscription.items.data[0]
      const defaultPaymentMethod = stripeSubscription.default_payment_method

      return {
        id: stripeSubscription.id,
        currentItemId: currentItem?.id ?? null,
        currentPriceId: currentItem?.price.id ?? null,
        quantity: currentItem?.quantity ?? 1,
        customerId: resolveCustomerId(stripeSubscription.customer),
        nextBillingDate: resolveNextBillingDate(stripeSubscription, currentItem),
        scheduleId: resolveScheduleId(stripeSubscription.schedule),
        defaultPaymentMethod:
          defaultPaymentMethod && typeof defaultPaymentMethod !== 'string'
            ? mapCardPaymentMethod(defaultPaymentMethod)
            : null,
      }
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async retrievePrice(priceId: string): Promise<{ amount: number; currency: string }> {
    try {
      const price = await stripeClient.prices.retrieve(priceId)
      return {
        amount: (price.unit_amount ?? 0) / 100,
        currency: price.currency,
      }
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async createUpgradePreview(input: {
    customerId: string
    subscriptionId: string
    itemId: string
    newPriceId: string
  }): Promise<StripePlanChangePreview> {
    try {
      const preview = await stripeClient.invoices.createPreview({
        customer: input.customerId,
        subscription: input.subscriptionId,
        subscription_details: {
          items: [{ id: input.itemId, price: input.newPriceId }],
          proration_behavior: 'always_invoice',
          proration_date: Math.floor(Date.now() / 1000),
        },
      })

      return {
        adjustment: computeAdjustment(preview),
        proratedNewCharge: computeProratedNewCharge(preview),
        totalDueToday: (preview.amount_due ?? 0) / 100,
      }
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async findCustomerDefaultCardPaymentMethod(
    customerId: string
  ): Promise<PaymentMethodCard | null> {
    try {
      const customer = await stripeClient.customers.retrieve(customerId)
      if ('deleted' in customer && customer.deleted) return null

      const defaultPaymentMethod = customer.invoice_settings.default_payment_method
      if (!defaultPaymentMethod) return null

      const paymentMethodId =
        typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id
      const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId)

      return mapCardPaymentMethod(paymentMethod)
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async releaseExistingScheduleIfAny(scheduleId: string | null): Promise<void> {
    if (!scheduleId) return

    try {
      const existing = await stripeClient.subscriptionSchedules.retrieve(scheduleId)
      if (existing.status === 'active' || existing.status === 'not_started') {
        await stripeClient.subscriptionSchedules.release(scheduleId)
      }
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async upgradeSubscription(input: {
    subscriptionId: string
    itemId: string
    newPriceId: string
  }): Promise<void> {
    try {
      await stripeClient.subscriptions.update(input.subscriptionId, {
        items: [{ id: input.itemId, price: input.newPriceId }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'error_if_incomplete',
      })
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async scheduleDowngrade(input: {
    subscriptionId: string
    itemId: string
    newPriceId: string
    quantity: number
  }): Promise<string> {
    try {
      const schedule = await stripeClient.subscriptionSchedules.create({
        from_subscription: input.subscriptionId,
      })
      const firstPhase = schedule.phases[0]
      if (!firstPhase) {
        throw new Error('Subscription schedule has no initial phase')
      }

      const firstPhaseItems = firstPhase.items.map((item) => ({
        price: typeof item.price === 'string' ? item.price : item.price.id,
        quantity: item.quantity,
      }))

      await stripeClient.subscriptionSchedules.update(schedule.id, {
        phases: [
          {
            items: firstPhaseItems,
            start_date: firstPhase.start_date,
            end_date: firstPhase.end_date,
            proration_behavior: 'none',
          },
          {
            items: [{ price: input.newPriceId, quantity: input.quantity }],
            proration_behavior: 'none',
          },
        ],
      })

      return isoDateFromEpoch(firstPhase.end_date)
    } catch (error) {
      wrapStripeError(error)
    }
  }

  async cancelPendingSchedule(scheduleId: string | null): Promise<boolean> {
    if (!scheduleId) return false

    try {
      const existing = await stripeClient.subscriptionSchedules.retrieve(scheduleId)
      if (existing.status !== 'active' && existing.status !== 'not_started') {
        return false
      }

      await stripeClient.subscriptionSchedules.release(scheduleId)
      return true
    } catch (error) {
      wrapStripeError(error)
    }
  }
}
