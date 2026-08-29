import type { OnboardingProgress } from '../domain'

export interface OnboardingStepStatus extends OnboardingProgress {
  accountCreated: boolean
  organizationCreated: boolean
  subscriptionActive: boolean
}

export interface CreateOrganizationInput {
  userId: string
  name: string
  slug: string
  logo?: string
  tagline?: string
}

export interface PlanFeature {
  key: string
  label: string
  included: boolean
}

export interface PlanPrice {
  amount: number
  currency: string
}

export interface SubscriptionPlan {
  name: string
  displayName: string
  tagline: string
  priceId: string
  priceIds: {
    monthly: string
    annual: string
  }
  price?: {
    amount: number
    currency: string
    interval: 'month' | 'year'
  }
  prices?: {
    monthly: PlanPrice
    annual: PlanPrice
  }
  limits: {
    members: number
  }
  features: PlanFeature[]
  freeTrial?: {
    days: number
  }
}

export interface OrganizationNameAvailability {
  available: boolean
  errorCode?: string
  slug?: string
}

export type OrganizationSlugAvailability = OrganizationNameAvailability
