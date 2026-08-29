import { describe, expect, it, mock } from 'bun:test'
import type {
  StripeSubscriptionCurrentPort,
  SubscriptionCurrentRepositoryPort,
} from '../application/ports'
import { SubscriptionCurrentUseCase } from '../application/subscription-current.use-cases'
import type {
  SubscriptionCurrentOrganization,
  SubscriptionCurrentPriceSnapshot,
  SubscriptionCurrentRecord,
} from '../domain'

const periodEnd = new Date('2026-07-01T00:00:00.000Z')
const trialStart = new Date('2026-05-01T00:00:00.000Z')
const trialEnd = new Date('2026-05-15T00:00:00.000Z')

function createOrganization(
  overrides: Partial<SubscriptionCurrentOrganization> = {}
): SubscriptionCurrentOrganization {
  return {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    status: 'active',
    ...overrides,
  }
}

function createSubscription(
  overrides: Partial<SubscriptionCurrentRecord> = {}
): SubscriptionCurrentRecord {
  return {
    plan: 'professional',
    status: 'active',
    periodEnd,
    cancelAtPeriodEnd: false,
    trialStart: null,
    trialEnd: null,
    stripeSubscriptionId: 'stripe-sub-1',
    ...overrides,
  }
}

function createPriceSnapshot(
  overrides: Partial<SubscriptionCurrentPriceSnapshot> = {}
): SubscriptionCurrentPriceSnapshot {
  return {
    pricePerSeat: 49,
    totalMonthlyPrice: 147,
    currentPriceId: 'price-pro',
    pendingPlanChange: null,
    ...overrides,
  }
}

function createRepository(
  input: {
    organizationId?: string | null
    organization?: SubscriptionCurrentOrganization | null
    subscriptions?: SubscriptionCurrentRecord[]
  } = {}
): SubscriptionCurrentRepositoryPort {
  return {
    findUserOrganizationId: mock(async () =>
      input.organizationId === undefined ? 'org-1' : input.organizationId
    ),
    findOrganization: mock(async () =>
      input.organization === undefined ? createOrganization() : input.organization
    ),
    listSubscriptions: mock(async () => input.subscriptions ?? [createSubscription()]),
  }
}

function createStripeSubscriptions(
  input: { priceSnapshot?: SubscriptionCurrentPriceSnapshot; error?: Error } = {}
): StripeSubscriptionCurrentPort {
  return {
    getPriceSnapshot: mock(async () => {
      if (input.error) throw input.error
      return input.priceSnapshot ?? createPriceSnapshot()
    }),
  }
}

function createUseCase(
  input: {
    repository?: SubscriptionCurrentRepositoryPort
    stripeSubscriptions?: StripeSubscriptionCurrentPort
  } = {}
) {
  const repository = input.repository ?? createRepository()
  const stripeSubscriptions = input.stripeSubscriptions ?? createStripeSubscriptions()

  return {
    repository,
    stripeSubscriptions,
    useCase: new SubscriptionCurrentUseCase(repository, stripeSubscriptions),
  }
}

describe('Subscription current use case', () => {
  it('returns the anonymous current state without loading repositories', async () => {
    const { repository, stripeSubscriptions, useCase } = createUseCase()

    const result = await useCase.getCurrent({ userId: null })

    expect(result).toEqual({
      plan: null,
      status: null,
      hasUsedTrial: false,
      hasActiveSubscription: false,
      hasOrganization: false,
      organization: null,
    })
    expect(repository.findUserOrganizationId).not.toHaveBeenCalled()
    expect(stripeSubscriptions.getPriceSnapshot).not.toHaveBeenCalled()
  })

  it('returns no organization state when the user has no membership', async () => {
    const { repository, useCase } = createUseCase({
      repository: createRepository({ organizationId: null }),
    })

    const result = await useCase.getCurrent({ userId: 'user-1' })

    expect(result.hasOrganization).toBe(false)
    expect(result.hasActiveSubscription).toBe(false)
    expect(repository.findOrganization).not.toHaveBeenCalled()
  })

  it('returns organization state without active subscription and tracks trial usage', async () => {
    const organization = createOrganization({ slug: null })
    const { stripeSubscriptions, useCase } = createUseCase({
      repository: createRepository({
        organization,
        subscriptions: [
          createSubscription({
            status: 'canceled',
            trialStart,
            stripeSubscriptionId: null,
          }),
        ],
      }),
    })

    const result = await useCase.getCurrent({ userId: 'user-1' })

    expect(result).toEqual({
      plan: null,
      status: null,
      cancelAtPeriodEnd: false,
      cancelsAt: null,
      hasUsedTrial: true,
      hasActiveSubscription: false,
      hasOrganization: true,
      organization,
    })
    expect(stripeSubscriptions.getPriceSnapshot).not.toHaveBeenCalled()
  })

  it('returns active subscription state without Stripe when the local subscription is not linked', async () => {
    const activeSubscription = createSubscription({
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: true,
      trialStart,
      trialEnd,
    })
    const { stripeSubscriptions, useCase } = createUseCase({
      repository: createRepository({ subscriptions: [activeSubscription] }),
    })

    const result = await useCase.getCurrent({ userId: 'user-1' })

    expect(result).toEqual({
      plan: 'professional',
      status: 'active',
      pricePerSeat: 0,
      totalMonthlyPrice: 0,
      currentPriceId: null,
      nextBillingDate: periodEnd,
      cancelAtPeriodEnd: true,
      cancelsAt: periodEnd,
      pendingPlanChange: null,
      trialStart,
      trialEnd,
      hasUsedTrial: true,
      hasActiveSubscription: true,
      hasOrganization: true,
      organization: createOrganization(),
    })
    expect(stripeSubscriptions.getPriceSnapshot).not.toHaveBeenCalled()
  })

  it('merges Stripe price and pending change details for active linked subscriptions', async () => {
    const priceSnapshot = createPriceSnapshot({
      pendingPlanChange: {
        newPlan: 'Enterprise',
        newPlanKey: 'enterprise',
        newPriceId: 'price-enterprise',
        billingInterval: 'annual',
        effectiveAt: '2026-07-01',
      },
    })
    const { stripeSubscriptions, useCase } = createUseCase({
      stripeSubscriptions: createStripeSubscriptions({ priceSnapshot }),
    })

    const result = await useCase.getCurrent({ userId: 'user-1' })

    expect(result).toMatchObject({
      pricePerSeat: 49,
      totalMonthlyPrice: 147,
      currentPriceId: 'price-pro',
      pendingPlanChange: priceSnapshot.pendingPlanChange,
      hasActiveSubscription: true,
      hasOrganization: true,
    })
    expect(stripeSubscriptions.getPriceSnapshot).toHaveBeenCalledWith('stripe-sub-1')
  })

  it('keeps the route-compatible active state when Stripe price lookup fails', async () => {
    const originalConsoleError = console.error
    console.error = mock(() => undefined) as typeof console.error

    try {
      const { useCase } = createUseCase({
        stripeSubscriptions: createStripeSubscriptions({ error: new Error('Stripe down') }),
      })

      const result = await useCase.getCurrent({ userId: 'user-1' })

      expect(result).toMatchObject({
        pricePerSeat: 0,
        totalMonthlyPrice: 0,
        currentPriceId: null,
        pendingPlanChange: null,
        hasActiveSubscription: true,
      })
    } finally {
      console.error = originalConsoleError
    }
  })
})
