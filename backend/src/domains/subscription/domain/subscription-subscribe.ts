export type PlanKey = 'starter' | 'professional' | 'enterprise'

export class SubscribeError extends Error {
  constructor(
    public code:
      | 'INVALID_PRICE_ID'
      | 'ALREADY_SUBSCRIBED'
      | 'ORGANIZATION_NOT_FOUND'
      | 'USER_NOT_FOUND'
      | 'SUBSCRIPTION_ORG_MISMATCH'
      | 'SUBSCRIPTION_NOT_ACTIVE'
      | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export interface SubscribeInput {
  organizationId: string
  userId: string
  priceId: string
}

export interface SubscribeResult {
  clientSecret: string
  subscriptionId: string
  type: 'payment'
}

export interface ConfirmSubscribeInput {
  organizationId: string
  subscriptionId: string
}

export interface ConfirmSubscribeResult {
  success: true
  plan: PlanKey
  subscriptionId: string
}

export type SubscribeOrganizationRecord = {
  id: string
  name: string
}

export type SubscribeUserRecord = {
  id: string
  email: string
}

export type StripeSubscribeSubscriptionSnapshot = {
  id: string
  status: string
  customerId: string
  organizationId: string | null
  priceId: string
  quantity: number
  clientSecret: string | null
  periodStart: Date | null
  periodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
}

export type ConfirmedSubscriptionRecord = {
  plan: PlanKey
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  seats: string
  billingModel: 'per-seat'
  periodStart: Date | null
  periodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
}

export function assertKnownPricePlan(
  plan: PlanKey | null,
  message = 'Unknown price ID'
): asserts plan is PlanKey {
  if (!plan) {
    throw new SubscribeError('INVALID_PRICE_ID', message)
  }
}

export function assertCanStartSubscription(hasActiveSubscription: boolean): void {
  if (hasActiveSubscription) {
    throw new SubscribeError(
      'ALREADY_SUBSCRIBED',
      'Your organization already has an active subscription.'
    )
  }
}

export function assertOrganizationFound(
  organization: SubscribeOrganizationRecord | null
): asserts organization is SubscribeOrganizationRecord {
  if (!organization) {
    throw new SubscribeError('ORGANIZATION_NOT_FOUND', 'Organization not found.')
  }
}

export function assertUserFound(
  user: SubscribeUserRecord | null
): asserts user is SubscribeUserRecord {
  if (!user) {
    throw new SubscribeError('USER_NOT_FOUND', 'User not found.')
  }
}

export function buildSubscribeResult(
  subscription: StripeSubscribeSubscriptionSnapshot
): SubscribeResult {
  if (!subscription.clientSecret) {
    throw new SubscribeError(
      'STRIPE_UNAVAILABLE',
      "Couldn't create a payment intent. Please try again."
    )
  }

  return {
    clientSecret: subscription.clientSecret,
    subscriptionId: subscription.id,
    type: 'payment',
  }
}

export function assertSubscriptionBelongsToOrganization(
  subscription: StripeSubscribeSubscriptionSnapshot,
  organizationId: string
): void {
  if (subscription.organizationId !== organizationId) {
    throw new SubscribeError(
      'SUBSCRIPTION_ORG_MISMATCH',
      "This subscription doesn't belong to your organization."
    )
  }
}

export function assertSubscriptionIsActive(
  subscription: StripeSubscribeSubscriptionSnapshot
): void {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new SubscribeError(
      'SUBSCRIPTION_NOT_ACTIVE',
      "Your subscription isn't active yet. Please complete payment first."
    )
  }
}

export function buildConfirmSubscribeResult(
  plan: PlanKey,
  subscriptionId: string
): ConfirmSubscribeResult {
  return {
    success: true,
    plan,
    subscriptionId,
  }
}

export function buildConfirmedSubscriptionRecord(
  plan: PlanKey,
  organizationId: string,
  subscription: StripeSubscribeSubscriptionSnapshot
): ConfirmedSubscriptionRecord {
  return {
    plan,
    organizationId,
    stripeCustomerId: subscription.customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    seats: subscription.quantity.toString(),
    billingModel: 'per-seat',
    periodStart: subscription.periodStart,
    periodEnd: subscription.periodEnd,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
  }
}
