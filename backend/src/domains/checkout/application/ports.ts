import type {
  CheckoutConfirmedSubscription,
  CheckoutCreatedSubscription,
  CheckoutPlanPrice,
  CheckoutSubscriptionRecord,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  StartFreeTrialInput,
} from './checkout-models'

export interface CheckoutPlanPricePort {
  getPlanPrice(plan: string): CheckoutPlanPrice | undefined
}

export interface CheckoutBillingPort {
  createSubscription(input: {
    customerEmail: string
    customerName: string
    organizationName: string
    organizationSlug?: string
    plan: string
    priceId: string
    initialSeats: number
    trialDays: number
  }): Promise<CreateSubscriptionResult>

  retrieveSubscription(subscriptionId: string): Promise<CheckoutConfirmedSubscription>

  createCardlessTrialSubscription(
    input: StartFreeTrialInput & {
      priceId: string
      trialDays: number
    }
  ): Promise<CheckoutCreatedSubscription>

  retrieveCheckoutSubscription(subscriptionId: string): Promise<CheckoutCreatedSubscription>

  updateCustomerMetadata(customerId: string, metadata: Record<string, string>): Promise<void>

  updateSubscriptionMetadata(
    subscriptionId: string,
    metadata: Record<string, string>
  ): Promise<void>
}

export interface CheckoutPersistencePort {
  findUserIdByEmail(email: string): Promise<string | null>
  userHasOrganizationMembership(userId: string): Promise<boolean>
  findOrganizationById(
    organizationId: string
  ): Promise<{ organizationId: string; slug: string } | null>
  userOwnsOrganization(userId: string, organizationId: string): Promise<boolean>
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void>
  createOrganization(input: {
    id: string
    name: string
    slug: string
    stripeCustomerId: string
    createdAt: Date
  }): Promise<void>
  createOwnerMembership(input: {
    id: string
    organizationId: string
    userId: string
    createdAt: Date
  }): Promise<void>
  createSubscriptionRecord(record: CheckoutSubscriptionRecord): Promise<void>
}

export interface CheckoutSlugPort {
  generateSlug(organizationName: string): string
  validateSlug(slug: string): { valid: true } | { valid: false; errorCode: string; error: string }
  isSlugAvailable(slug: string): Promise<boolean>
}

export interface CheckoutConversationPort {
  createTeamConversation(organizationId: string, userId: string): Promise<void>
}

export interface CheckoutIdPort {
  randomId(): string
}

export interface CheckoutClockPort {
  now(): Date
}

export interface CheckoutUseCaseDependencies {
  plans: CheckoutPlanPricePort
  billing: CheckoutBillingPort
  persistence: CheckoutPersistencePort
  slugs: CheckoutSlugPort
  conversations: CheckoutConversationPort
  ids: CheckoutIdPort
  clock: CheckoutClockPort
}

export type CheckoutCreateSubscriptionCommand = CreateSubscriptionInput
