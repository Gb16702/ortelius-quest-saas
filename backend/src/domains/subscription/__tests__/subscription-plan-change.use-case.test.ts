import { describe, expect, it, mock } from 'bun:test'
import type {
  StripeSubscriptionPlanChangePort,
  SubscriptionActivityPort,
  SubscriptionPlanChangePricingPort,
  SubscriptionPlanChangeRepositoryPort,
} from '../application/ports'
import { SubscriptionPlanChangeUseCase } from '../application/subscription-plan-change.use-cases'
import {
  type ActivePlanChangeSubscription,
  PlanChangeError,
  type PlanPrice,
  type StripePlanChangeSubscriptionSnapshot,
} from '../domain'

function createActiveSubscription(
  overrides: Partial<ActivePlanChangeSubscription> = {}
): ActivePlanChangeSubscription {
  return {
    id: 'sub-1',
    stripeSubscriptionId: 'stripe-sub-1',
    ...overrides,
  }
}

function createStripeSubscription(
  overrides: Partial<StripePlanChangeSubscriptionSnapshot> = {}
): StripePlanChangeSubscriptionSnapshot {
  return {
    id: 'stripe-sub-1',
    currentItemId: 'item-1',
    currentPriceId: 'price-starter',
    quantity: 3,
    customerId: 'cus-1',
    nextBillingDate: '2026-07-01',
    scheduleId: null,
    defaultPaymentMethod: {
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
    },
    ...overrides,
  }
}

function createRepository(
  input: { subscription?: ActivePlanChangeSubscription | null } = {}
): SubscriptionPlanChangeRepositoryPort {
  return {
    findActiveSubscription: mock(async () =>
      input.subscription === undefined ? createActiveSubscription() : input.subscription
    ),
    updatePlan: mock(async () => undefined),
  }
}

function createPricing(
  input: { prices?: Record<string, PlanPrice | null> } = {}
): SubscriptionPlanChangePricingPort {
  const prices = input.prices ?? {
    'price-starter': { key: 'starter', interval: 'monthly' },
    'price-pro': { key: 'professional', interval: 'monthly' },
    'price-enterprise': { key: 'enterprise', interval: 'annual' },
  }

  return {
    resolvePlanPrice: mock((priceId) => prices[priceId] ?? null),
  }
}

function createStripePlanChanges(
  input: { subscription?: StripePlanChangeSubscriptionSnapshot } = {}
): StripeSubscriptionPlanChangePort {
  return {
    retrieveSubscription: mock(async () => input.subscription ?? createStripeSubscription()),
    retrievePrice: mock(async () => ({ amount: 59, currency: 'eur' })),
    createUpgradePreview: mock(async () => ({
      adjustment: -10,
      proratedNewCharge: 20,
      totalDueToday: 10,
    })),
    findCustomerDefaultCardPaymentMethod: mock(async () => ({
      type: 'card',
      brand: 'mastercard',
      last4: '5555',
      expMonth: 1,
      expYear: 2031,
    })),
    releaseExistingScheduleIfAny: mock(async () => undefined),
    upgradeSubscription: mock(async () => undefined),
    scheduleDowngrade: mock(async () => '2026-07-01'),
    cancelPendingSchedule: mock(async () => true),
  }
}

function createActivity(): SubscriptionActivityPort {
  return {
    logEvent: mock(async () => undefined),
  }
}

function createUseCase(
  input: {
    repository?: SubscriptionPlanChangeRepositoryPort
    stripePlanChanges?: StripeSubscriptionPlanChangePort
    pricing?: SubscriptionPlanChangePricingPort
    activity?: SubscriptionActivityPort
  } = {}
) {
  const repository = input.repository ?? createRepository()
  const stripePlanChanges = input.stripePlanChanges ?? createStripePlanChanges()
  const pricing = input.pricing ?? createPricing()
  const activity = input.activity ?? createActivity()

  return {
    repository,
    stripePlanChanges,
    pricing,
    activity,
    useCase: new SubscriptionPlanChangeUseCase(repository, stripePlanChanges, pricing, activity),
  }
}

describe('Subscription plan change use case', () => {
  it('rejects unknown target prices before loading subscriptions', async () => {
    const { repository, useCase } = createUseCase({
      pricing: createPricing({ prices: { 'price-bad': null } }),
    })

    await expect(
      useCase.previewChange({ organizationId: 'org-1', newPriceId: 'price-bad' })
    ).rejects.toThrow(PlanChangeError)
    expect(repository.findActiveSubscription).not.toHaveBeenCalled()
  })

  it('rejects organizations without an active Stripe-linked subscription', async () => {
    const { stripePlanChanges, useCase } = createUseCase({
      repository: createRepository({ subscription: null }),
    })

    await expect(
      useCase.previewChange({ organizationId: 'org-1', newPriceId: 'price-pro' })
    ).rejects.toThrow(PlanChangeError)
    expect(stripePlanChanges.retrieveSubscription).not.toHaveBeenCalled()
  })

  it('builds downgrade previews without proration preview calls', async () => {
    const { stripePlanChanges, useCase } = createUseCase({
      stripePlanChanges: createStripePlanChanges({
        subscription: createStripeSubscription({ currentPriceId: 'price-enterprise' }),
      }),
    })

    const result = await useCase.previewChange({
      organizationId: 'org-1',
      newPriceId: 'price-pro',
    })

    expect(result).toEqual({
      direction: 'downgrade',
      newPlan: 'Professional',
      newPlanKey: 'professional',
      newPrice: 59,
      billingInterval: 'monthly',
      currentPlan: 'Enterprise',
      currentPlanKey: 'enterprise',
      nextBillingDate: '2026-07-01',
      currency: 'eur',
    })
    expect(stripePlanChanges.createUpgradePreview).not.toHaveBeenCalled()
  })

  it('builds upgrade previews with proration and payment method details', async () => {
    const { stripePlanChanges, useCase } = createUseCase()

    const result = await useCase.previewChange({
      organizationId: 'org-1',
      newPriceId: 'price-pro',
    })

    expect(result).toEqual({
      direction: 'upgrade',
      newPlan: 'Professional',
      newPlanKey: 'professional',
      newPrice: 59,
      billingInterval: 'monthly',
      currentPlan: 'Starter',
      currentPlanKey: 'starter',
      nextBillingDate: '2026-07-01',
      currency: 'eur',
      proratedNewCharge: 20,
      adjustment: -10,
      totalDueToday: 10,
      paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
      },
    })
    expect(stripePlanChanges.createUpgradePreview).toHaveBeenCalledWith({
      customerId: 'cus-1',
      subscriptionId: 'stripe-sub-1',
      itemId: 'item-1',
      newPriceId: 'price-pro',
    })
  })

  it('updates Stripe and the local plan immediately for upgrades', async () => {
    const { repository, stripePlanChanges, useCase } = createUseCase()

    const result = await useCase.changePlan({
      organizationId: 'org-1',
      newPriceId: 'price-pro',
    })

    expect(result.direction).toBe('upgrade')
    expect(result.subscriptionId).toBe('stripe-sub-1')
    expect(stripePlanChanges.upgradeSubscription).toHaveBeenCalledWith({
      subscriptionId: 'stripe-sub-1',
      itemId: 'item-1',
      newPriceId: 'price-pro',
    })
    expect(repository.updatePlan).toHaveBeenCalledWith('sub-1', 'professional')
  })

  it('logs plan changes through the activity port when an actor is provided', async () => {
    const activity = createActivity()
    const { useCase } = createUseCase({ activity })

    const result = await useCase.changePlan({
      organizationId: 'org-1',
      newPriceId: 'price-pro',
      actorId: 'user-1',
    })

    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-plan-changed',
      description: `plan changed (${result.direction}, effective ${result.effectiveAt})`,
    })
  })

  it('schedules downgrades without changing the local plan immediately', async () => {
    const { repository, stripePlanChanges, useCase } = createUseCase({
      stripePlanChanges: createStripePlanChanges({
        subscription: createStripeSubscription({ currentPriceId: 'price-enterprise' }),
      }),
    })

    const result = await useCase.changePlan({
      organizationId: 'org-1',
      newPriceId: 'price-pro',
    })

    expect(result).toEqual({
      success: true,
      subscriptionId: 'stripe-sub-1',
      direction: 'downgrade',
      effectiveAt: '2026-07-01',
    })
    expect(stripePlanChanges.scheduleDowngrade).toHaveBeenCalledWith({
      subscriptionId: 'stripe-sub-1',
      itemId: 'item-1',
      newPriceId: 'price-pro',
      quantity: 3,
    })
    expect(repository.updatePlan).not.toHaveBeenCalled()
  })

  it('cancels pending plan changes', async () => {
    const { stripePlanChanges, useCase } = createUseCase({
      stripePlanChanges: createStripePlanChanges({
        subscription: createStripeSubscription({ scheduleId: 'sched-1' }),
      }),
    })

    const result = await useCase.cancelPendingChange({ organizationId: 'org-1' })

    expect(result).toEqual({ success: true })
    expect(stripePlanChanges.cancelPendingSchedule).toHaveBeenCalledWith('sched-1')
  })

  it('logs pending plan change cancellation through the activity port', async () => {
    const activity = createActivity()
    const { useCase } = createUseCase({
      activity,
      stripePlanChanges: createStripePlanChanges({
        subscription: createStripeSubscription({ scheduleId: 'sched-1' }),
      }),
    })

    await useCase.cancelPendingChange({ organizationId: 'org-1', actorId: 'user-1' })

    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-pending-change-canceled',
      description: 'canceled pending plan change',
    })
  })

  it('rejects cancel pending change when Stripe has no active pending schedule', async () => {
    const stripePlanChanges = createStripePlanChanges()
    stripePlanChanges.cancelPendingSchedule = mock(async () => false)
    const { useCase } = createUseCase({ stripePlanChanges })

    await expect(useCase.cancelPendingChange({ organizationId: 'org-1' })).rejects.toThrow(
      PlanChangeError
    )
  })
})
