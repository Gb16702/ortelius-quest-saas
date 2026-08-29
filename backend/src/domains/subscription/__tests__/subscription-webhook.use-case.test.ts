import { describe, expect, it, mock } from 'bun:test'
import type { SubscriptionWebhookRepositoryPort } from '../application/ports'
import { SubscriptionWebhookUseCase } from '../application/subscription-webhook.use-cases'
import type { StripeWebhookSubscriptionSnapshot, SubscriptionWebhookRecord } from '../domain'

function createSubscription(
  overrides: Partial<SubscriptionWebhookRecord> = {}
): SubscriptionWebhookRecord {
  return {
    id: 'sub-1',
    status: 'active',
    ...overrides,
  }
}

function createSnapshot(
  overrides: Partial<StripeWebhookSubscriptionSnapshot> = {}
): StripeWebhookSubscriptionSnapshot {
  return {
    stripeSubscriptionId: 'stripe-sub-1',
    status: 'active',
    seats: 3,
    periodEnd: new Date('2026-07-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    ...overrides,
  }
}

function createRepository(
  input: { subscription?: SubscriptionWebhookRecord | null } = {}
): SubscriptionWebhookRepositoryPort {
  return {
    findByStripeSubscriptionId: mock(async () =>
      input.subscription === undefined ? createSubscription() : input.subscription
    ),
    updateFromStripeSubscription: mock(async () => undefined),
    markCanceled: mock(async () => undefined),
    markPastDue: mock(async () => undefined),
    markActive: mock(async () => undefined),
  }
}

describe('Subscription webhook use case', () => {
  it('skips subscription updates when no local subscription exists', async () => {
    const repository = createRepository({ subscription: null })
    const useCase = new SubscriptionWebhookUseCase(repository)

    const result = await useCase.handleSubscriptionUpdated(createSnapshot())

    expect(result).toEqual({
      handled: false,
      warning:
        '[StripeWebhook] subscription.updated: no DB row for stripeSubscriptionId=stripe-sub-1',
    })
    expect(repository.updateFromStripeSubscription).not.toHaveBeenCalled()
  })

  it('updates local subscription state from Stripe subscription snapshots', async () => {
    const repository = createRepository()
    const useCase = new SubscriptionWebhookUseCase(repository)
    const snapshot = createSnapshot({ status: 'trialing', cancelAtPeriodEnd: true })

    const result = await useCase.handleSubscriptionUpdated(snapshot)

    expect(result).toEqual({ handled: true })
    expect(repository.updateFromStripeSubscription).toHaveBeenCalledWith(snapshot)
  })

  it('marks invoices without subscription ids as skipped', async () => {
    const repository = createRepository()
    const useCase = new SubscriptionWebhookUseCase(repository)

    const result = await useCase.handleInvoicePaymentFailed({
      invoiceId: 'in-1',
      stripeSubscriptionId: null,
    })

    expect(result).toEqual({
      handled: false,
      warning: '[StripeWebhook] invoice.payment_failed: no subscription on invoice id=in-1',
    })
    expect(repository.findByStripeSubscriptionId).not.toHaveBeenCalled()
  })

  it('marks failed invoice subscriptions past due', async () => {
    const repository = createRepository()
    const useCase = new SubscriptionWebhookUseCase(repository)

    const result = await useCase.handleInvoicePaymentFailed({
      invoiceId: 'in-1',
      stripeSubscriptionId: 'stripe-sub-1',
    })

    expect(result).toEqual({ handled: true })
    expect(repository.markPastDue).toHaveBeenCalledWith('stripe-sub-1')
  })

  it('reactivates only subscriptions that were past due after successful invoice payment', async () => {
    const repository = createRepository({
      subscription: createSubscription({ status: 'past_due' }),
    })
    const useCase = new SubscriptionWebhookUseCase(repository)

    const result = await useCase.handleInvoicePaymentSucceeded({
      invoiceId: 'in-1',
      stripeSubscriptionId: 'stripe-sub-1',
    })

    expect(result).toEqual({ handled: true })
    expect(repository.markActive).toHaveBeenCalledWith('stripe-sub-1')
  })

  it('does not reactivate subscriptions that are not past due', async () => {
    const repository = createRepository({
      subscription: createSubscription({ status: 'active' }),
    })
    const useCase = new SubscriptionWebhookUseCase(repository)

    const result = await useCase.handleInvoicePaymentSucceeded({
      invoiceId: 'in-1',
      stripeSubscriptionId: 'stripe-sub-1',
    })

    expect(result).toEqual({ handled: true })
    expect(repository.markActive).not.toHaveBeenCalled()
  })
})
