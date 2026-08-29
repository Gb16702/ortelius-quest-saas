import type { InviteEmailValidationResult } from '../domain'

export interface CreateSubscriptionInput {
  email: string
  fullName: string
  organizationName: string
  organizationSlug?: string
  plan: string
  priceId?: string
  annual?: boolean
  initialSeats?: number
}

export interface CreateSubscriptionResult {
  clientSecret: string
  subscriptionId: string
  customerId: string
  type: 'payment' | 'setup'
}

export interface ConfirmSubscriptionResult {
  subscriptionId: string
  status: string
  customerId: string | unknown
}

export interface ValidateInviteEmailInput {
  email: string
  currentUserEmail: string
}

export type ValidateInviteEmailResult = InviteEmailValidationResult

export interface StartFreeTrialInput {
  organizationName: string
  organizationSlug?: string
  plan: string
  userId: string
  email: string
  fullName: string
}

export interface CompleteCheckoutInput {
  checkoutId?: string
  stripeSubscriptionId?: string
  organizationName?: string
  organizationSlug?: string
  userId: string
}

export interface CheckoutOrganizationResult {
  organizationId: string
  slug: string
  checkoutId?: string
}

export interface CheckoutPlanPrice {
  monthly: string
  annual?: string
}

export interface CheckoutSubscriptionRecord {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  seats: string
  billingModel: string
  periodStart: Date | null
  periodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CheckoutCreatedSubscription {
  id: string
  status: string
  metadata: Record<string, string>
  currentPeriodStart?: number | null
  currentPeriodEnd?: number | null
  trialStart?: number | null
  trialEnd?: number | null
  customerId: string
  firstItemQuantity?: number | null
  firstItemCurrentPeriodStart?: number | null
  firstItemCurrentPeriodEnd?: number | null
}

export type CheckoutConfirmedSubscription = ConfirmSubscriptionResult
