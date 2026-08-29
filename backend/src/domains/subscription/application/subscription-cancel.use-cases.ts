import {
  assertCanResumeSubscription,
  assertCanScheduleCancellation,
  buildCancellationResult,
  buildResumeResult,
  type CancelInput,
  type CancelResult,
  CancelSubscriptionError,
  normalizeCancellationFeedback,
  parseCancelReason,
  type ResumeInput,
  type ResumeResult,
  resolveCancellationPeriodEnd,
} from '../domain'
import type {
  StripeSubscriptionCancellationPort,
  SubscriptionActivityPort,
  SubscriptionCancelRepositoryPort,
} from './ports'
import { noopSubscriptionActivity } from './subscription-activity'

export class SubscriptionCancelUseCase {
  constructor(
    private readonly subscriptions: SubscriptionCancelRepositoryPort,
    private readonly stripeSubscriptions: StripeSubscriptionCancellationPort,
    private readonly activity: SubscriptionActivityPort = noopSubscriptionActivity
  ) {}

  async cancel(input: CancelInput): Promise<CancelResult> {
    const reason = parseCancelReason(input.reason)
    const activeSubscription = await this.getActiveSubscription(input.organizationId)

    assertCanScheduleCancellation(activeSubscription)

    const { periodEnd: stripePeriodEnd } = await this.stripeSubscriptions.scheduleCancelAtPeriodEnd(
      activeSubscription.stripeSubscriptionId
    )
    const periodEnd = resolveCancellationPeriodEnd(stripePeriodEnd, activeSubscription.periodEnd)

    await this.subscriptions.scheduleCancellation(activeSubscription.id, periodEnd)
    await this.subscriptions.recordCancellationFeedback({
      subscriptionId: activeSubscription.id,
      organizationId: input.organizationId,
      userId: input.userId,
      reason,
      feedback: normalizeCancellationFeedback(input.feedback),
    })

    const result = buildCancellationResult(periodEnd)
    void this.activity.logEvent({
      organizationId: input.organizationId,
      actorId: input.userId,
      eventType: 'subscription-canceled',
      description: `subscription canceled (ends ${formatCancellationDate(result.cancelsAt)})`,
    })

    return result
  }

  async resume(input: ResumeInput): Promise<ResumeResult> {
    const activeSubscription = await this.getActiveSubscription(input.organizationId)

    assertCanResumeSubscription(activeSubscription)

    await this.stripeSubscriptions.resume(activeSubscription.stripeSubscriptionId)
    await this.subscriptions.resumeCancellation(activeSubscription.id)

    const result = buildResumeResult(activeSubscription)
    void this.activity.logEvent({
      organizationId: input.organizationId,
      actorId: input.userId,
      eventType: 'subscription-resumed',
      description: `subscription resumed (${result.plan})`,
    })

    return result
  }

  private async getActiveSubscription(organizationId: string) {
    const activeSubscription = await this.subscriptions.findActiveSubscription(organizationId)

    if (!activeSubscription) {
      throw new CancelSubscriptionError(
        'NO_ACTIVE_SUBSCRIPTION',
        'No active subscription found for this organization.'
      )
    }

    return activeSubscription
  }
}

function formatCancellationDate(cancelsAt: string | null): string {
  if (!cancelsAt) return 'unknown'

  return new Date(cancelsAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
