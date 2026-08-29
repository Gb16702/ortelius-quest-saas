import { describe, expect, it, mock } from 'bun:test'
import {
  SubscriptionApplicationService,
  type SubscriptionApplicationUseCaseLoaders,
} from '../subscription.application'

function createLoaders(webhooks: unknown): SubscriptionApplicationUseCaseLoaders {
  return {
    billingAccess: async () => ({}) as never,
    billingAccount: async () => ({}) as never,
    billingPreferences: async () => ({}) as never,
    cancel: async () => ({}) as never,
    current: async () => ({}) as never,
    paymentMethods: async () => ({}) as never,
    planChanges: async () => ({}) as never,
    seats: async () => ({}) as never,
    subscribe: async () => ({}) as never,
    webhooks: async () => ({ webhooks }) as never,
  }
}

describe('Subscription application service', () => {
  it('delegates subscription update snapshots to the webhook use case', async () => {
    const handleSubscriptionUpdated = mock(async () => ({ handled: true }))
    const service = new SubscriptionApplicationService(
      createLoaders({
        handleSubscriptionUpdated,
      })
    )
    const snapshot = {
      stripeSubscriptionId: 'stripe-sub-1',
      status: 'active',
      seats: 3,
      periodEnd: new Date('2026-06-01T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
    }

    await service.handleSubscriptionUpdated(snapshot)

    expect(handleSubscriptionUpdated).toHaveBeenCalledWith(snapshot)
  })

  it('delegates invoice payment snapshots to the webhook use case', async () => {
    const handleInvoicePaymentFailed = mock(async () => ({ handled: true }))
    const service = new SubscriptionApplicationService(
      createLoaders({
        handleInvoicePaymentFailed,
      })
    )

    await service.handleInvoicePaymentFailed({
      invoiceId: 'in_1',
      stripeSubscriptionId: 'stripe-sub-1',
    })

    expect(handleInvoicePaymentFailed).toHaveBeenCalledWith({
      invoiceId: 'in_1',
      stripeSubscriptionId: 'stripe-sub-1',
    })
  })

  it('logs skipped webhook results returned by the use case', async () => {
    const warning = '[StripeWebhook] invoice.payment_failed: no subscription on invoice id=in_1'
    const handleInvoicePaymentFailed = mock(async () => ({
      handled: false,
      warning,
    }))
    const service = new SubscriptionApplicationService(
      createLoaders({
        handleInvoicePaymentFailed,
      })
    )
    const warn = mock(() => undefined)
    const originalWarn = console.warn
    console.warn = warn

    try {
      await service.handleInvoicePaymentFailed({
        invoiceId: 'in_1',
        stripeSubscriptionId: null,
      })

      expect(warn).toHaveBeenCalledWith(warning)
    } finally {
      console.warn = originalWarn
    }
  })
})
