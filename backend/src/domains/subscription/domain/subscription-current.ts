import type { PendingPlanChange } from './subscription-plan-change'

export type SubscriptionCurrentOrganization = {
  id: string
  name: string
  slug: string | null
  status: string
}

export type SubscriptionCurrentRecord = {
  plan: string
  status: string
  periodEnd: Date | null
  cancelAtPeriodEnd: boolean | null
  trialStart: Date | null
  trialEnd: Date | null
  stripeSubscriptionId: string | null
}

export type SubscriptionCurrentPriceSnapshot = {
  pricePerSeat: number
  totalMonthlyPrice: number
  currentPriceId: string | null
  pendingPlanChange: PendingPlanChange | null
}

export type SubscriptionCurrentNoOrganizationState = {
  plan: null
  status: null
  hasUsedTrial: false
  hasActiveSubscription: false
  hasOrganization: false
  organization: null
}

export type SubscriptionCurrentNoActiveState = {
  plan: null
  status: null
  cancelAtPeriodEnd: false
  cancelsAt: null
  hasUsedTrial: boolean
  hasActiveSubscription: false
  hasOrganization: true
  organization: SubscriptionCurrentOrganization | null
}

export type SubscriptionCurrentActiveState = {
  plan: string
  status: string
  pricePerSeat: number
  totalMonthlyPrice: number
  currentPriceId: string | null
  nextBillingDate: Date | null
  cancelAtPeriodEnd: boolean
  cancelsAt: Date | null
  pendingPlanChange: PendingPlanChange | null
  trialStart: Date | null
  trialEnd: Date | null
  hasUsedTrial: boolean
  hasActiveSubscription: true
  hasOrganization: true
  organization: SubscriptionCurrentOrganization | null
}

export type SubscriptionCurrentState =
  | SubscriptionCurrentNoOrganizationState
  | SubscriptionCurrentNoActiveState
  | SubscriptionCurrentActiveState

export function buildNoOrganizationSubscriptionCurrentState(): SubscriptionCurrentNoOrganizationState {
  return {
    plan: null,
    status: null,
    hasUsedTrial: false,
    hasActiveSubscription: false,
    hasOrganization: false,
    organization: null,
  }
}

export function hasUsedSubscriptionTrial(subscriptions: SubscriptionCurrentRecord[]): boolean {
  return subscriptions.some((subscription) => {
    return subscription.trialStart !== null || subscription.status === 'trialing'
  })
}

export function findActiveCurrentSubscription(
  subscriptions: SubscriptionCurrentRecord[]
): SubscriptionCurrentRecord | null {
  return (
    subscriptions.find((subscription) => {
      return subscription.status === 'active' || subscription.status === 'trialing'
    }) ?? null
  )
}

export function buildNoActiveSubscriptionCurrentState(input: {
  organization: SubscriptionCurrentOrganization | null
  hasUsedTrial: boolean
}): SubscriptionCurrentNoActiveState {
  return {
    plan: null,
    status: null,
    cancelAtPeriodEnd: false,
    cancelsAt: null,
    hasUsedTrial: input.hasUsedTrial,
    hasActiveSubscription: false,
    hasOrganization: true,
    organization: input.organization,
  }
}

export function emptySubscriptionCurrentPriceSnapshot(): SubscriptionCurrentPriceSnapshot {
  return {
    pricePerSeat: 0,
    totalMonthlyPrice: 0,
    currentPriceId: null,
    pendingPlanChange: null,
  }
}

export function buildActiveSubscriptionCurrentState(input: {
  organization: SubscriptionCurrentOrganization | null
  subscription: SubscriptionCurrentRecord
  hasUsedTrial: boolean
  priceSnapshot: SubscriptionCurrentPriceSnapshot
}): SubscriptionCurrentActiveState {
  const cancelAtPeriodEnd = input.subscription.cancelAtPeriodEnd ?? false

  return {
    plan: input.subscription.plan,
    status: input.subscription.status,
    pricePerSeat: input.priceSnapshot.pricePerSeat,
    totalMonthlyPrice: input.priceSnapshot.totalMonthlyPrice,
    currentPriceId: input.priceSnapshot.currentPriceId,
    nextBillingDate: input.subscription.periodEnd,
    cancelAtPeriodEnd,
    cancelsAt:
      cancelAtPeriodEnd && input.subscription.periodEnd ? input.subscription.periodEnd : null,
    pendingPlanChange: input.priceSnapshot.pendingPlanChange,
    trialStart: input.subscription.trialStart,
    trialEnd: input.subscription.trialEnd,
    hasUsedTrial: input.hasUsedTrial,
    hasActiveSubscription: true,
    hasOrganization: true,
    organization: input.organization,
  }
}
