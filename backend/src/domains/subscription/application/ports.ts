import type {
  ActivePaymentSubscription,
  ActivePlanChangeSubscription,
  BillingAddress,
  CancellationFeedbackInput,
  ConfirmedSubscriptionRecord,
  InvoiceLanguage,
  PaymentMethodCandidate,
  PaymentMethodCard,
  PaymentMethodInfo,
  PlanKey,
  PlanPrice,
  StripePlanChangePreview,
  StripePlanChangeSubscriptionSnapshot,
  StripeSubscribeSubscriptionSnapshot,
  StripeWebhookSubscriptionSnapshot,
  SubscribeOrganizationRecord,
  SubscribeUserRecord,
  SubscriptionBillingMembership,
  SubscriptionCancelRecord,
  SubscriptionCurrentOrganization,
  SubscriptionCurrentPriceSnapshot,
  SubscriptionCurrentRecord,
  SubscriptionInvoiceDetail,
  SubscriptionInvoiceListResult,
  SubscriptionPortalSessionResult,
  SubscriptionSeatRecord,
  SubscriptionWebhookRecord,
} from '../domain'

export interface SubscriptionSeatRepositoryPort {
  findActiveSubscription(organizationId: string): Promise<SubscriptionSeatRecord | null>
  countOrganizationMembers(organizationId: string): Promise<number>
  updateSeats(subscriptionId: string, seats: number): Promise<void>
}

export interface SubscriptionActivityPort {
  logEvent(input: {
    organizationId: string
    actorId: string
    eventType: string
    description: string
  }): Promise<void>
}

export interface StripeSubscriptionSeatPort {
  getFirstSubscriptionItemId(stripeSubscriptionId: string): Promise<string>
  updateSubscriptionItemQuantity(subscriptionItemId: string, quantity: number): Promise<void>
}

export interface SubscriptionCancelRepositoryPort {
  findActiveSubscription(organizationId: string): Promise<SubscriptionCancelRecord | null>
  scheduleCancellation(subscriptionId: string, periodEnd: Date | null): Promise<void>
  resumeCancellation(subscriptionId: string): Promise<void>
  recordCancellationFeedback(feedback: CancellationFeedbackInput): Promise<void>
}

export interface StripeSubscriptionCancellationPort {
  scheduleCancelAtPeriodEnd(stripeSubscriptionId: string): Promise<{ periodEnd: Date | null }>
  resume(stripeSubscriptionId: string): Promise<void>
}

export interface SubscriptionCustomerRegistryPort {
  getCustomerId(organizationId: string): Promise<string | null>
  ensureCustomer(input: { organizationId: string; ownerEmail?: string }): Promise<string>
}

export interface BillingOrganizationPort {
  getOrganizationName(organizationId: string): Promise<string | null>
}

export interface BillingPreferencesPort {
  getInvoiceEmail(customerId: string): Promise<string | null>
  updateInvoiceEmail(customerId: string, email: string): Promise<string | null>
  getInvoiceLanguage(customerId: string): Promise<InvoiceLanguage | null>
  updateInvoiceLanguage(customerId: string, language: InvoiceLanguage): Promise<void>
  getBillingAddress(customerId: string): Promise<BillingAddress | null>
  updateBillingAddress(input: {
    customerId: string
    address: BillingAddress
    name: string | null
  }): Promise<BillingAddress | null>
}

export interface SubscriptionPaymentMethodRepositoryPort {
  findActiveSubscription(organizationId: string): Promise<ActivePaymentSubscription | null>
}

export interface StripePaymentMethodPort {
  getDefaultPaymentMethod(customerId: string): Promise<PaymentMethodInfo | null>
  createSetupIntent(input: {
    customerId: string
    organizationId: string
    subscriptionId: string | null
  }): Promise<string | null>
  retrievePaymentMethod(paymentMethodId: string): Promise<PaymentMethodCandidate | null>
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<void>
  setCustomerDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<string | null>
  setSubscriptionDefaultPaymentMethod(
    stripeSubscriptionId: string,
    paymentMethodId: string
  ): Promise<void>
  retryLatestOpenInvoice(customerId: string, paymentMethodId: string): Promise<void>
  detachPaymentMethod(paymentMethodId: string): Promise<void>
}

export interface SubscriptionPricingPort {
  resolvePlan(priceId: string): PlanKey | null
}

export interface SubscriptionSubscribeRepositoryPort {
  hasActiveSubscription(organizationId: string): Promise<boolean>
  findOrganization(organizationId: string): Promise<SubscribeOrganizationRecord | null>
  findUser(userId: string): Promise<SubscribeUserRecord | null>
  hasStripeSubscription(stripeSubscriptionId: string): Promise<boolean>
  createSubscription(subscription: ConfirmedSubscriptionRecord): Promise<void>
}

export interface StripeSubscriptionSubscribePort {
  createSubscription(input: {
    customerId: string
    organizationId: string
    userId: string
    priceId: string
  }): Promise<StripeSubscribeSubscriptionSnapshot>
  retrieveSubscription(subscriptionId: string): Promise<StripeSubscribeSubscriptionSnapshot>
}

export interface SubscriptionWebhookRepositoryPort {
  findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<SubscriptionWebhookRecord | null>
  updateFromStripeSubscription(snapshot: StripeWebhookSubscriptionSnapshot): Promise<void>
  markCanceled(stripeSubscriptionId: string): Promise<void>
  markPastDue(stripeSubscriptionId: string): Promise<void>
  markActive(stripeSubscriptionId: string): Promise<void>
}

export interface SubscriptionPlanChangePricingPort {
  resolvePlanPrice(priceId: string): PlanPrice | null
}

export interface SubscriptionPlanChangeRepositoryPort {
  findActiveSubscription(organizationId: string): Promise<ActivePlanChangeSubscription | null>
  updatePlan(subscriptionId: string, plan: PlanKey): Promise<void>
}

export interface StripeSubscriptionPlanChangePort {
  retrieveSubscription(stripeSubscriptionId: string): Promise<StripePlanChangeSubscriptionSnapshot>
  retrievePrice(priceId: string): Promise<{ amount: number; currency: string }>
  createUpgradePreview(input: {
    customerId: string
    subscriptionId: string
    itemId: string
    newPriceId: string
  }): Promise<StripePlanChangePreview>
  findCustomerDefaultCardPaymentMethod(customerId: string): Promise<PaymentMethodCard | null>
  releaseExistingScheduleIfAny(scheduleId: string | null): Promise<void>
  upgradeSubscription(input: {
    subscriptionId: string
    itemId: string
    newPriceId: string
  }): Promise<void>
  scheduleDowngrade(input: {
    subscriptionId: string
    itemId: string
    newPriceId: string
    quantity: number
  }): Promise<string>
  cancelPendingSchedule(scheduleId: string | null): Promise<boolean>
}

export interface SubscriptionCurrentRepositoryPort {
  findUserOrganizationId(userId: string): Promise<string | null>
  findOrganization(organizationId: string): Promise<SubscriptionCurrentOrganization | null>
  listSubscriptions(organizationId: string): Promise<SubscriptionCurrentRecord[]>
}

export interface StripeSubscriptionCurrentPort {
  getPriceSnapshot(stripeSubscriptionId: string): Promise<SubscriptionCurrentPriceSnapshot>
}

export interface SubscriptionBillingAccessRepositoryPort {
  findMembership(userId: string): Promise<SubscriptionBillingMembership | null>
  findMembershipInOrganization(input: {
    userId: string
    organizationId: string
  }): Promise<SubscriptionBillingMembership | null>
  findUserEmail(userId: string): Promise<string | null>
  findActiveSubscriptionCustomerId(organizationId: string): Promise<string | null>
  findOrganizationSlug(organizationId: string): Promise<string | null | undefined>
}

export interface StripeSubscriptionInvoicePort {
  listInvoices(input: {
    customerId: string
    limit: number
    startingAfter?: string
  }): Promise<SubscriptionInvoiceListResult>
  retrieveInvoice(input: {
    invoiceId: string
    customerId: string
  }): Promise<SubscriptionInvoiceDetail | null>
}

export interface StripeSubscriptionPortalPort {
  createBillingPortalSession(input: {
    customerId: string
    organizationSlug: string | null | undefined
  }): Promise<SubscriptionPortalSessionResult>
}
