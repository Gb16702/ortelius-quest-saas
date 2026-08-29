export const CANCEL_REASONS = [
  'too_expensive',
  'temporary_break',
  'missing_features',
  'switching_to_competitor',
  'low_usage',
  'bugs_or_errors',
  'other',
] as const

export type CancelReason = (typeof CANCEL_REASONS)[number]

export type CancelSubscriptionErrorCode =
  | 'NO_ACTIVE_SUBSCRIPTION'
  | 'ALREADY_CANCELED'
  | 'NOT_CANCELED'
  | 'INVALID_REASON'
  | 'STRIPE_UNAVAILABLE'

export class CancelSubscriptionError extends Error {
  constructor(
    public code: CancelSubscriptionErrorCode,
    message: string
  ) {
    super(message)
  }
}

export interface CancelInput {
  organizationId: string
  userId: string
  reason?: string | null
  feedback?: string | null
}

export interface CancelResult {
  success: true
  cancelsAt: string | null
}

export interface ResumeInput {
  organizationId: string
  userId: string
}

export interface ResumeResult {
  success: true
  plan: string
}

export type SubscriptionCancelRecord = {
  id: string
  plan: string
  stripeSubscriptionId: string | null
  cancelAtPeriodEnd: boolean
  periodEnd: Date | null
}

export type StripeLinkedSubscriptionCancelRecord = SubscriptionCancelRecord & {
  stripeSubscriptionId: string
}

export type CancellationFeedbackInput = {
  subscriptionId: string
  organizationId: string
  userId: string
  reason: CancelReason | null
  feedback: string | null
}

export function parseCancelReason(reason: string | null | undefined): CancelReason | null {
  if (!reason) return null

  if (CANCEL_REASONS.includes(reason as CancelReason)) {
    return reason as CancelReason
  }

  throw new CancelSubscriptionError('INVALID_REASON', 'Unknown cancellation reason.')
}

export function normalizeCancellationFeedback(feedback: string | null | undefined): string | null {
  return feedback?.trim() || null
}

export function assertCanScheduleCancellation(
  subscription: SubscriptionCancelRecord
): asserts subscription is StripeLinkedSubscriptionCancelRecord {
  if (subscription.cancelAtPeriodEnd) {
    throw new CancelSubscriptionError(
      'ALREADY_CANCELED',
      'Your subscription is already scheduled to cancel.'
    )
  }

  if (!subscription.stripeSubscriptionId) {
    throw new CancelSubscriptionError(
      'NO_ACTIVE_SUBSCRIPTION',
      'No Stripe subscription linked to this organization.'
    )
  }
}

export function assertCanResumeSubscription(
  subscription: SubscriptionCancelRecord
): asserts subscription is StripeLinkedSubscriptionCancelRecord {
  if (!subscription.cancelAtPeriodEnd) {
    throw new CancelSubscriptionError(
      'NOT_CANCELED',
      "This subscription isn't scheduled to cancel."
    )
  }

  if (!subscription.stripeSubscriptionId) {
    throw new CancelSubscriptionError(
      'NO_ACTIVE_SUBSCRIPTION',
      'No Stripe subscription linked to this organization.'
    )
  }
}

export function resolveCancellationPeriodEnd(
  stripePeriodEnd: Date | null,
  currentPeriodEnd: Date | null
): Date | null {
  return stripePeriodEnd ?? currentPeriodEnd
}

export function buildCancellationResult(periodEnd: Date | null): CancelResult {
  return {
    success: true,
    cancelsAt: periodEnd?.toISOString() ?? null,
  }
}

export function buildResumeResult(subscription: SubscriptionCancelRecord): ResumeResult {
  return {
    success: true,
    plan: subscription.plan,
  }
}
