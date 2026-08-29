import type { PlanKey } from './subscription-subscribe'

export type BillingInterval = 'monthly' | 'annual'
export type PlanChangeDirection = 'upgrade' | 'downgrade'

export type PlanPrice = {
  key: PlanKey
  interval: BillingInterval
}

const PLAN_TIER_ORDER: Record<PlanKey, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
}

const PLAN_DISPLAY_NAMES: Record<PlanKey, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export interface PaymentMethodCard {
  type: 'card'
  brand: string
  last4: string
  expMonth?: number
  expYear?: number
}

interface PreviewChangeBase {
  newPlan: string
  newPlanKey: PlanKey
  newPrice: number
  billingInterval: BillingInterval
  currentPlan: string
  currentPlanKey: PlanKey
  nextBillingDate: string
  currency: string
}

export interface PreviewChangeUpgrade extends PreviewChangeBase {
  direction: 'upgrade'
  proratedNewCharge: number
  adjustment: number
  totalDueToday: number
  paymentMethod: PaymentMethodCard | null
}

export interface PreviewChangeDowngrade extends PreviewChangeBase {
  direction: 'downgrade'
}

export type PreviewChangeResult = PreviewChangeUpgrade | PreviewChangeDowngrade

export interface ChangePlanResult {
  success: true
  subscriptionId: string
  direction: PlanChangeDirection
  effectiveAt: string
}

export interface PendingPlanChange {
  newPlan: string
  newPlanKey: PlanKey
  newPriceId: string
  billingInterval: BillingInterval
  effectiveAt: string
}

export type ActivePlanChangeSubscription = {
  id: string
  stripeSubscriptionId: string | null
}

export type StripePlanChangeSubscriptionSnapshot = {
  id: string
  currentItemId: string | null
  currentPriceId: string | null
  quantity: number
  customerId: string
  nextBillingDate: string
  scheduleId: string | null
  defaultPaymentMethod: PaymentMethodCard | null
}

export type StripePlanChangePreview = {
  adjustment: number
  proratedNewCharge: number
  totalDueToday: number
}

export class PlanChangeError extends Error {
  constructor(
    public code:
      | 'NO_PLAN_CHANGE'
      | 'NO_ACTIVE_SUBSCRIPTION'
      | 'INVALID_PRICE_ID'
      | 'STRIPE_UNAVAILABLE'
      | 'NO_PENDING_CHANGE',
    message: string
  ) {
    super(message)
  }
}

export function getPlanDisplayName(plan: PlanKey): string {
  return PLAN_DISPLAY_NAMES[plan]
}

export function assertKnownPlanPrice(
  planPrice: PlanPrice | null,
  message = 'Unknown price ID'
): asserts planPrice is PlanPrice {
  if (!planPrice) {
    throw new PlanChangeError('INVALID_PRICE_ID', message)
  }
}

export function assertActiveSubscriptionLinked(
  subscription: ActivePlanChangeSubscription | null
): asserts subscription is ActivePlanChangeSubscription & { stripeSubscriptionId: string } {
  if (!subscription?.stripeSubscriptionId) {
    throw new PlanChangeError('NO_ACTIVE_SUBSCRIPTION', 'No active subscription found')
  }
}

export function assertSubscriptionHasItem(
  subscription: StripePlanChangeSubscriptionSnapshot
): asserts subscription is StripePlanChangeSubscriptionSnapshot & {
  currentItemId: string
  currentPriceId: string
} {
  if (!subscription.currentItemId || !subscription.currentPriceId) {
    throw new PlanChangeError('NO_ACTIVE_SUBSCRIPTION', 'Subscription has no items')
  }
}

export function assertPlanWillChange(currentPriceId: string, newPriceId: string): void {
  if (currentPriceId === newPriceId) {
    throw new PlanChangeError('NO_PLAN_CHANGE', 'Already on this plan')
  }
}

export function resolvePlanChangeDirection(current: PlanKey, target: PlanKey): PlanChangeDirection {
  return PLAN_TIER_ORDER[target] > PLAN_TIER_ORDER[current] ? 'upgrade' : 'downgrade'
}

export function buildPreviewChangeBase(input: {
  targetPlan: PlanPrice
  currentPlan: PlanPrice
  newPrice: number
  nextBillingDate: string
  currency: string
}): PreviewChangeBase {
  return {
    newPlan: getPlanDisplayName(input.targetPlan.key),
    newPlanKey: input.targetPlan.key,
    newPrice: input.newPrice,
    billingInterval: input.targetPlan.interval,
    currentPlan: getPlanDisplayName(input.currentPlan.key),
    currentPlanKey: input.currentPlan.key,
    nextBillingDate: input.nextBillingDate,
    currency: input.currency,
  }
}

export function buildDowngradePreview(base: PreviewChangeBase): PreviewChangeDowngrade {
  return { ...base, direction: 'downgrade' }
}

export function buildUpgradePreview(
  base: PreviewChangeBase,
  preview: StripePlanChangePreview,
  paymentMethod: PaymentMethodCard | null
): PreviewChangeUpgrade {
  return {
    ...base,
    direction: 'upgrade',
    proratedNewCharge: preview.proratedNewCharge,
    adjustment: preview.adjustment,
    totalDueToday: preview.totalDueToday,
    paymentMethod,
  }
}

export function buildChangePlanResult(input: {
  subscriptionId: string
  direction: PlanChangeDirection
  effectiveAt: string
}): ChangePlanResult {
  return {
    success: true,
    subscriptionId: input.subscriptionId,
    direction: input.direction,
    effectiveAt: input.effectiveAt,
  }
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function assertPendingChangeCanceled(canceled: boolean): void {
  if (!canceled) {
    throw new PlanChangeError('NO_PENDING_CHANGE', 'There is no pending plan change to cancel.')
  }
}
