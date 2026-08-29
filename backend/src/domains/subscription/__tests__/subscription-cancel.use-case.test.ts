import { describe, expect, it, mock } from 'bun:test'
import type {
  StripeSubscriptionCancellationPort,
  SubscriptionActivityPort,
  SubscriptionCancelRepositoryPort,
} from '../application/ports'
import { SubscriptionCancelUseCase } from '../application/subscription-cancel.use-cases'
import { CancelSubscriptionError, type SubscriptionCancelRecord } from '../domain'

function createSubscription(
  overrides: Partial<SubscriptionCancelRecord> = {}
): SubscriptionCancelRecord {
  return {
    id: 'sub-1',
    plan: 'pro',
    stripeSubscriptionId: 'stripe-sub-1',
    cancelAtPeriodEnd: false,
    periodEnd: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createRepository(
  input: { subscription?: SubscriptionCancelRecord | null } = {}
): SubscriptionCancelRepositoryPort {
  return {
    findActiveSubscription: mock(async () =>
      input.subscription === undefined ? createSubscription() : input.subscription
    ),
    scheduleCancellation: mock(async () => undefined),
    resumeCancellation: mock(async () => undefined),
    recordCancellationFeedback: mock(async () => undefined),
  }
}

function createStripe(input: { periodEnd?: Date | null } = {}): StripeSubscriptionCancellationPort {
  return {
    scheduleCancelAtPeriodEnd: mock(async () => ({
      periodEnd: 'periodEnd' in input ? input.periodEnd! : new Date('2026-06-15T00:00:00.000Z'),
    })),
    resume: mock(async () => undefined),
  }
}

function createActivity(): SubscriptionActivityPort {
  return {
    logEvent: mock(async () => undefined),
  }
}

async function expectCancelError(promise: Promise<unknown>, code: CancelSubscriptionError['code']) {
  try {
    await promise
    throw new Error('Expected cancel subscription error')
  } catch (error) {
    expect(error).toBeInstanceOf(CancelSubscriptionError)
    expect((error as CancelSubscriptionError).code).toBe(code)
  }
}

describe('Subscription cancel use case', () => {
  it('rejects unknown cancellation reasons before touching persistence', async () => {
    const repository = createRepository()
    const stripe = createStripe()
    const useCase = new SubscriptionCancelUseCase(repository, stripe)

    await expectCancelError(
      useCase.cancel({
        organizationId: 'org-1',
        userId: 'user-1',
        reason: 'invalid',
      }),
      'INVALID_REASON'
    )

    expect(repository.findActiveSubscription).not.toHaveBeenCalled()
    expect(stripe.scheduleCancelAtPeriodEnd).not.toHaveBeenCalled()
  })

  it('rejects cancellation when no active subscription exists', async () => {
    const repository = createRepository({ subscription: null })
    const stripe = createStripe()
    const useCase = new SubscriptionCancelUseCase(repository, stripe)

    await expectCancelError(
      useCase.cancel({
        organizationId: 'org-1',
        userId: 'user-1',
      }),
      'NO_ACTIVE_SUBSCRIPTION'
    )

    expect(stripe.scheduleCancelAtPeriodEnd).not.toHaveBeenCalled()
  })

  it('rejects an already scheduled cancellation before calling Stripe', async () => {
    const repository = createRepository({
      subscription: createSubscription({ cancelAtPeriodEnd: true }),
    })
    const stripe = createStripe()
    const useCase = new SubscriptionCancelUseCase(repository, stripe)

    await expectCancelError(
      useCase.cancel({
        organizationId: 'org-1',
        userId: 'user-1',
      }),
      'ALREADY_CANCELED'
    )

    expect(stripe.scheduleCancelAtPeriodEnd).not.toHaveBeenCalled()
    expect(repository.scheduleCancellation).not.toHaveBeenCalled()
  })

  it('rejects cancellation when the active subscription has no Stripe subscription id', async () => {
    const repository = createRepository({
      subscription: createSubscription({ stripeSubscriptionId: null }),
    })
    const stripe = createStripe()
    const useCase = new SubscriptionCancelUseCase(repository, stripe)

    await expectCancelError(
      useCase.cancel({
        organizationId: 'org-1',
        userId: 'user-1',
      }),
      'NO_ACTIVE_SUBSCRIPTION'
    )

    expect(stripe.scheduleCancelAtPeriodEnd).not.toHaveBeenCalled()
  })

  it('schedules cancellation with Stripe, stores feedback, and returns the cancel date', async () => {
    const periodEnd = new Date('2026-07-01T00:00:00.000Z')
    const repository = createRepository()
    const stripe = createStripe({ periodEnd })
    const activity = createActivity()
    const useCase = new SubscriptionCancelUseCase(repository, stripe, activity)

    const result = await useCase.cancel({
      organizationId: 'org-1',
      userId: 'user-1',
      reason: 'too_expensive',
      feedback: '  Costs too much for our current usage.  ',
    })

    expect(result).toEqual({
      success: true,
      cancelsAt: '2026-07-01T00:00:00.000Z',
    })
    expect(stripe.scheduleCancelAtPeriodEnd).toHaveBeenCalledWith('stripe-sub-1')
    expect(repository.scheduleCancellation).toHaveBeenCalledWith('sub-1', periodEnd)
    expect(repository.recordCancellationFeedback).toHaveBeenCalledWith({
      subscriptionId: 'sub-1',
      organizationId: 'org-1',
      userId: 'user-1',
      reason: 'too_expensive',
      feedback: 'Costs too much for our current usage.',
    })
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-canceled',
      description: 'subscription canceled (ends July 1, 2026)',
    })
  })

  it('falls back to the local period end when Stripe does not return one', async () => {
    const localPeriodEnd = new Date('2026-06-01T00:00:00.000Z')
    const repository = createRepository({
      subscription: createSubscription({ periodEnd: localPeriodEnd }),
    })
    const stripe = createStripe({ periodEnd: null })
    const useCase = new SubscriptionCancelUseCase(repository, stripe)

    const result = await useCase.cancel({
      organizationId: 'org-1',
      userId: 'user-1',
    })

    expect(result.cancelsAt).toBe('2026-06-01T00:00:00.000Z')
    expect(repository.scheduleCancellation).toHaveBeenCalledWith('sub-1', localPeriodEnd)
  })

  it('rejects resume when the subscription is not scheduled to cancel', async () => {
    const repository = createRepository()
    const stripe = createStripe()
    const useCase = new SubscriptionCancelUseCase(repository, stripe)

    await expectCancelError(
      useCase.resume({
        organizationId: 'org-1',
        userId: 'user-1',
      }),
      'NOT_CANCELED'
    )

    expect(stripe.resume).not.toHaveBeenCalled()
  })

  it('resumes a scheduled cancellation through Stripe and local persistence', async () => {
    const repository = createRepository({
      subscription: createSubscription({ cancelAtPeriodEnd: true }),
    })
    const stripe = createStripe()
    const activity = createActivity()
    const useCase = new SubscriptionCancelUseCase(repository, stripe, activity)

    const result = await useCase.resume({
      organizationId: 'org-1',
      userId: 'user-1',
    })

    expect(result).toEqual({ success: true, plan: 'pro' })
    expect(stripe.resume).toHaveBeenCalledWith('stripe-sub-1')
    expect(repository.resumeCancellation).toHaveBeenCalledWith('sub-1')
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-resumed',
      description: 'subscription resumed (pro)',
    })
  })
})
