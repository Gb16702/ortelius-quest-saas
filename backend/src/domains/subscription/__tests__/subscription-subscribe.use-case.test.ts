import { describe, expect, it, mock } from 'bun:test'
import type {
  StripeSubscriptionSubscribePort,
  SubscriptionActivityPort,
  SubscriptionCustomerRegistryPort,
  SubscriptionPricingPort,
  SubscriptionSubscribeRepositoryPort,
} from '../application/ports'
import { SubscriptionSubscribeUseCase } from '../application/subscription-subscribe.use-cases'
import {
  type ConfirmedSubscriptionRecord,
  type PlanKey,
  type StripeSubscribeSubscriptionSnapshot,
  SubscribeError,
  type SubscribeOrganizationRecord,
  type SubscribeUserRecord,
} from '../domain'

function createStripeSubscription(
  overrides: Partial<StripeSubscribeSubscriptionSnapshot> = {}
): StripeSubscribeSubscriptionSnapshot {
  return {
    id: 'stripe-sub-1',
    status: 'active',
    customerId: 'cus-1',
    organizationId: 'org-1',
    priceId: 'price-pro',
    quantity: 3,
    clientSecret: 'pi_secret_1',
    periodStart: new Date('2026-06-01T00:00:00.000Z'),
    periodEnd: new Date('2026-07-01T00:00:00.000Z'),
    trialStart: null,
    trialEnd: null,
    ...overrides,
  }
}

function createRepository(
  input: {
    hasActive?: boolean
    organization?: SubscribeOrganizationRecord | null
    user?: SubscribeUserRecord | null
    hasStripeSubscription?: boolean
  } = {}
): SubscriptionSubscribeRepositoryPort {
  return {
    hasActiveSubscription: mock(async () => input.hasActive ?? false),
    findOrganization: mock(async () =>
      input.organization === undefined ? { id: 'org-1', name: 'Acme' } : input.organization
    ),
    findUser: mock(async () =>
      input.user === undefined ? { id: 'user-1', email: 'owner@example.com' } : input.user
    ),
    hasStripeSubscription: mock(async () => input.hasStripeSubscription ?? false),
    createSubscription: mock(async () => undefined),
  }
}

function createCustomerRegistry(): SubscriptionCustomerRegistryPort {
  return {
    getCustomerId: mock(async () => 'cus-1'),
    ensureCustomer: mock(async () => 'cus-1'),
  }
}

function createStripeSubscriptions(
  input: { subscription?: StripeSubscribeSubscriptionSnapshot } = {}
): StripeSubscriptionSubscribePort {
  return {
    createSubscription: mock(async () => input.subscription ?? createStripeSubscription()),
    retrieveSubscription: mock(async () => input.subscription ?? createStripeSubscription()),
  }
}

function createPricing(input: { plan?: PlanKey | null } = {}): SubscriptionPricingPort {
  return {
    resolvePlan: mock(() => (input.plan === undefined ? 'professional' : input.plan)),
  }
}

function createActivity(): SubscriptionActivityPort {
  return {
    logEvent: mock(async () => undefined),
  }
}

function createUseCase(
  input: {
    repository?: SubscriptionSubscribeRepositoryPort
    customerRegistry?: SubscriptionCustomerRegistryPort
    stripeSubscriptions?: StripeSubscriptionSubscribePort
    pricing?: SubscriptionPricingPort
    activity?: SubscriptionActivityPort
  } = {}
) {
  const repository = input.repository ?? createRepository()
  const customerRegistry = input.customerRegistry ?? createCustomerRegistry()
  const stripeSubscriptions = input.stripeSubscriptions ?? createStripeSubscriptions()
  const pricing = input.pricing ?? createPricing()
  const activity = input.activity ?? createActivity()

  return {
    repository,
    customerRegistry,
    stripeSubscriptions,
    pricing,
    activity,
    useCase: new SubscriptionSubscribeUseCase(
      repository,
      customerRegistry,
      stripeSubscriptions,
      pricing,
      activity
    ),
  }
}

describe('Subscription subscribe use case', () => {
  it('rejects unknown price ids before querying persistence', async () => {
    const { repository, useCase } = createUseCase({
      pricing: createPricing({ plan: null }),
    })

    await expect(
      useCase.subscribe({ organizationId: 'org-1', userId: 'user-1', priceId: 'bad-price' })
    ).rejects.toThrow(SubscribeError)
    expect(repository.hasActiveSubscription).not.toHaveBeenCalled()
  })

  it('rejects already subscribed organizations before creating a Stripe customer', async () => {
    const { customerRegistry, useCase } = createUseCase({
      repository: createRepository({ hasActive: true }),
    })

    await expect(
      useCase.subscribe({ organizationId: 'org-1', userId: 'user-1', priceId: 'price-pro' })
    ).rejects.toThrow(SubscribeError)
    expect(customerRegistry.ensureCustomer).not.toHaveBeenCalled()
  })

  it('creates the Stripe subscription and returns the payment client secret', async () => {
    const { customerRegistry, stripeSubscriptions, useCase } = createUseCase()

    const result = await useCase.subscribe({
      organizationId: 'org-1',
      userId: 'user-1',
      priceId: 'price-pro',
    })

    expect(result).toEqual({
      clientSecret: 'pi_secret_1',
      subscriptionId: 'stripe-sub-1',
      type: 'payment',
    })
    expect(customerRegistry.ensureCustomer).toHaveBeenCalledWith({
      organizationId: 'org-1',
      ownerEmail: 'owner@example.com',
    })
    expect(stripeSubscriptions.createSubscription).toHaveBeenCalledWith({
      customerId: 'cus-1',
      organizationId: 'org-1',
      userId: 'user-1',
      priceId: 'price-pro',
    })
  })

  it('rejects subscribe when Stripe does not return a client secret', async () => {
    const { useCase } = createUseCase({
      stripeSubscriptions: createStripeSubscriptions({
        subscription: createStripeSubscription({ clientSecret: null }),
      }),
    })

    await expect(
      useCase.subscribe({ organizationId: 'org-1', userId: 'user-1', priceId: 'price-pro' })
    ).rejects.toThrow(SubscribeError)
  })

  it('rejects confirmation when the Stripe subscription belongs to another organization', async () => {
    const { useCase } = createUseCase({
      stripeSubscriptions: createStripeSubscriptions({
        subscription: createStripeSubscription({ organizationId: 'org-other' }),
      }),
    })

    await expect(
      useCase.confirmSubscribe({ organizationId: 'org-1', subscriptionId: 'stripe-sub-1' })
    ).rejects.toThrow(SubscribeError)
  })

  it('returns success without inserting when the subscription already exists locally', async () => {
    const { repository, useCase } = createUseCase({
      repository: createRepository({ hasStripeSubscription: true }),
    })

    const result = await useCase.confirmSubscribe({
      organizationId: 'org-1',
      subscriptionId: 'stripe-sub-1',
    })

    expect(result).toEqual({
      success: true,
      plan: 'professional',
      subscriptionId: 'stripe-sub-1',
    })
    expect(repository.createSubscription).not.toHaveBeenCalled()
  })

  it('persists confirmed active Stripe subscriptions locally', async () => {
    const activity = createActivity()
    const { repository, useCase } = createUseCase({ activity })

    const result = await useCase.confirmSubscribe({
      organizationId: 'org-1',
      subscriptionId: 'stripe-sub-1',
      actorId: 'user-1',
    })

    expect(result).toEqual({
      success: true,
      plan: 'professional',
      subscriptionId: 'stripe-sub-1',
    })
    expect(repository.createSubscription).toHaveBeenCalledWith({
      plan: 'professional',
      organizationId: 'org-1',
      stripeCustomerId: 'cus-1',
      stripeSubscriptionId: 'stripe-sub-1',
      status: 'active',
      seats: '3',
      billingModel: 'per-seat',
      periodStart: new Date('2026-06-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-01T00:00:00.000Z'),
      trialStart: null,
      trialEnd: null,
    } satisfies ConfirmedSubscriptionRecord)
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-created',
      description: 'subscription started (professional)',
    })
  })
})
