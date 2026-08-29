import { describe, expect, it, mock } from 'bun:test'
import type {
  StripeSubscriptionSeatPort,
  SubscriptionActivityPort,
  SubscriptionSeatRepositoryPort,
} from '../application/ports'
import { SyncSubscriptionSeatsUseCase } from '../application/subscription-seats.use-cases'
import type { SubscriptionSeatRecord } from '../domain'

function createSubscription(
  overrides: Partial<SubscriptionSeatRecord> = {}
): SubscriptionSeatRecord {
  return {
    id: 'sub-1',
    seats: '2',
    billingModel: 'per-seat',
    stripeSubscriptionId: 'stripe-sub-1',
    ...overrides,
  }
}

function createRepository(
  input: { subscription?: SubscriptionSeatRecord | null; memberCount?: number } = {}
): SubscriptionSeatRepositoryPort {
  return {
    findActiveSubscription: mock(async () =>
      input.subscription === undefined ? createSubscription() : input.subscription
    ),
    countOrganizationMembers: mock(async () => input.memberCount ?? 3),
    updateSeats: mock(async () => undefined),
  }
}

function createStripeSeats(): StripeSubscriptionSeatPort {
  return {
    getFirstSubscriptionItemId: mock(async () => 'item-1'),
    updateSubscriptionItemQuantity: mock(async () => undefined),
  }
}

function createActivity(): SubscriptionActivityPort {
  return {
    logEvent: mock(async () => undefined),
  }
}

describe('Subscription seat sync use case', () => {
  it('returns the legacy no-active-subscription envelope for explicit increases', async () => {
    const repository = createRepository({ subscription: null })
    const stripeSeats = createStripeSeats()
    const useCase = new SyncSubscriptionSeatsUseCase(repository, stripeSeats)

    const result = await useCase.increaseSeatCount({ organizationId: 'org-1' })

    expect(result).toEqual({
      success: false,
      newSeatCount: 0,
      error: 'No active subscription found',
    })
    expect(stripeSeats.getFirstSubscriptionItemId).not.toHaveBeenCalled()
  })

  it('skips fixed-price subscriptions without touching Stripe', async () => {
    const repository = createRepository({
      subscription: createSubscription({ seats: '5', billingModel: 'fixed-price' }),
    })
    const stripeSeats = createStripeSeats()
    const useCase = new SyncSubscriptionSeatsUseCase(repository, stripeSeats)

    const result = await useCase.increaseSeatCount({ organizationId: 'org-1' })

    expect(result).toEqual({
      success: true,
      newSeatCount: 5,
      error: 'Legacy subscription - seat update skipped',
    })
    expect(stripeSeats.getFirstSubscriptionItemId).not.toHaveBeenCalled()
  })

  it('updates Stripe and local seats on increase', async () => {
    const repository = createRepository({ memberCount: 4 })
    const stripeSeats = createStripeSeats()
    const useCase = new SyncSubscriptionSeatsUseCase(repository, stripeSeats)

    const result = await useCase.increaseSeatCount({ organizationId: 'org-1' })

    expect(result).toEqual({ success: true, newSeatCount: 4, prorationAmount: 0 })
    expect(stripeSeats.getFirstSubscriptionItemId).toHaveBeenCalledWith('stripe-sub-1')
    expect(stripeSeats.updateSubscriptionItemQuantity).toHaveBeenCalledWith('item-1', 4)
    expect(repository.updateSeats).toHaveBeenCalledWith('sub-1', 4)
  })

  it('clamps decreases to one seat', async () => {
    const repository = createRepository({ memberCount: 0 })
    const stripeSeats = createStripeSeats()
    const useCase = new SyncSubscriptionSeatsUseCase(repository, stripeSeats)

    const result = await useCase.decreaseSeatCount({ organizationId: 'org-1' })

    expect(result).toEqual({ success: true, newSeatCount: 1, prorationAmount: 0 })
    expect(stripeSeats.updateSubscriptionItemQuantity).toHaveBeenCalledWith('item-1', 1)
    expect(repository.updateSeats).toHaveBeenCalledWith('sub-1', 1)
  })

  it('reconciles without Stripe when seats already match', async () => {
    const repository = createRepository({ memberCount: 2 })
    const stripeSeats = createStripeSeats()
    const activity = createActivity()
    const useCase = new SyncSubscriptionSeatsUseCase(repository, stripeSeats, activity)

    const result = await useCase.reconcileSeats({ organizationId: 'org-1', actorId: 'user-1' })

    expect(result).toEqual({ success: true, newSeatCount: 2 })
    expect(stripeSeats.getFirstSubscriptionItemId).not.toHaveBeenCalled()
    expect(repository.updateSeats).not.toHaveBeenCalled()
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-seats-reconciled',
      description: 'reconciled subscription seats',
    })
  })
})
