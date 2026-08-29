import type {
  BillingAddress,
  CancelInput,
  CancelResult,
  ChangePlanResult,
  ConfirmSubscribeInput,
  ConfirmSubscribeResult,
  EnsureSubscriptionCustomerResult,
  InvoiceEmailState,
  InvoiceLanguage,
  InvoiceLanguageState,
  PaymentMethodInfo,
  PreviewChangeResult,
  ResumeInput,
  ResumeResult,
  SeatUpdateResult,
  SetupIntentResult,
  StripeWebhookInvoiceSnapshot,
  StripeWebhookSubscriptionSnapshot,
  SubscribeInput,
  SubscribeResult,
  SubscriptionBillingMembership,
  SubscriptionCurrentState,
  SubscriptionInvoiceDetail,
  SubscriptionInvoiceListResult,
  SubscriptionPortalSessionResult,
  UpdateBillingAddressInput,
  UpdatePaymentMethodInput,
  UpdatePaymentMethodResult,
  WebhookHandlingResult,
} from './domain'
import {
  getSubscriptionBillingAccessUseCases,
  type SubscriptionBillingAccessUseCaseContainer,
} from './infrastructure/subscription-billing-access-use-cases'
import {
  getSubscriptionBillingAccountUseCases,
  type SubscriptionBillingAccountUseCaseContainer,
} from './infrastructure/subscription-billing-account-use-cases'
import {
  getSubscriptionBillingPreferencesUseCases,
  type SubscriptionBillingPreferencesUseCaseContainer,
} from './infrastructure/subscription-billing-preferences-use-cases'
import {
  getSubscriptionCancelUseCases,
  type SubscriptionCancelUseCaseContainer,
} from './infrastructure/subscription-cancel-use-cases'
import {
  getSubscriptionCurrentUseCases,
  type SubscriptionCurrentUseCaseContainer,
} from './infrastructure/subscription-current-use-cases'
import {
  getSubscriptionPaymentMethodUseCases,
  type SubscriptionPaymentMethodUseCaseContainer,
} from './infrastructure/subscription-payment-method-use-cases'
import {
  getSubscriptionPlanChangeUseCases,
  type SubscriptionPlanChangeUseCaseContainer,
} from './infrastructure/subscription-plan-change-use-cases'
import {
  getSubscriptionSeatUseCases,
  type SubscriptionSeatUseCaseContainer,
} from './infrastructure/subscription-seat-use-cases'
import {
  getSubscriptionSubscribeUseCases,
  type SubscriptionSubscribeUseCaseContainer,
} from './infrastructure/subscription-subscribe-use-cases'
import {
  getSubscriptionWebhookUseCases,
  type SubscriptionWebhookUseCaseContainer,
} from './infrastructure/subscription-webhook-use-cases'

function logSkipped(result: WebhookHandlingResult): void {
  if (!result.handled) {
    console.warn(result.warning)
  }
}

export interface SubscriptionApplicationUseCaseLoaders {
  billingAccess(): Promise<SubscriptionBillingAccessUseCaseContainer>
  billingAccount(): Promise<SubscriptionBillingAccountUseCaseContainer>
  billingPreferences(): Promise<SubscriptionBillingPreferencesUseCaseContainer>
  cancel(): Promise<SubscriptionCancelUseCaseContainer>
  current(): Promise<SubscriptionCurrentUseCaseContainer>
  paymentMethods(): Promise<SubscriptionPaymentMethodUseCaseContainer>
  planChanges(): Promise<SubscriptionPlanChangeUseCaseContainer>
  seats(): Promise<SubscriptionSeatUseCaseContainer>
  subscribe(): Promise<SubscriptionSubscribeUseCaseContainer>
  webhooks(): Promise<SubscriptionWebhookUseCaseContainer>
}

const defaultUseCaseLoaders: SubscriptionApplicationUseCaseLoaders = {
  billingAccess: getSubscriptionBillingAccessUseCases,
  billingAccount: getSubscriptionBillingAccountUseCases,
  billingPreferences: getSubscriptionBillingPreferencesUseCases,
  cancel: getSubscriptionCancelUseCases,
  current: getSubscriptionCurrentUseCases,
  paymentMethods: getSubscriptionPaymentMethodUseCases,
  planChanges: getSubscriptionPlanChangeUseCases,
  seats: getSubscriptionSeatUseCases,
  subscribe: getSubscriptionSubscribeUseCases,
  webhooks: getSubscriptionWebhookUseCases,
}

export class SubscriptionApplicationService {
  constructor(
    private readonly useCases: SubscriptionApplicationUseCaseLoaders = defaultUseCaseLoaders
  ) {}

  async getCurrent(userId?: string | null): Promise<SubscriptionCurrentState> {
    const useCases = await this.useCases.current()
    return await useCases.current.getCurrent({ userId })
  }

  async requireBillingManager(input: {
    userId: string
    organizationId?: string
  }): Promise<SubscriptionBillingMembership> {
    const useCases = await this.useCases.billingAccess()
    return await useCases.billingAccess.requireBillingManager(input)
  }

  async reconcileSeats(organizationId: string, actorId?: string): Promise<SeatUpdateResult> {
    const useCases = await this.useCases.seats()
    return await useCases.syncSeats.reconcileSeats({ organizationId, actorId })
  }

  async increaseSeatCount(organizationId: string): Promise<SeatUpdateResult> {
    const useCases = await this.useCases.seats()
    return await useCases.syncSeats.increaseSeatCount({ organizationId })
  }

  async decreaseSeatCount(organizationId: string): Promise<SeatUpdateResult> {
    const useCases = await this.useCases.seats()
    return await useCases.syncSeats.decreaseSeatCount({ organizationId })
  }

  async listInvoices(input: {
    userId: string
    limit: number
    startingAfter?: string
  }): Promise<SubscriptionInvoiceListResult> {
    const useCases = await this.useCases.billingAccount()
    return await useCases.billingAccount.listInvoices(input)
  }

  async getInvoice(input: {
    userId: string
    invoiceId: string
  }): Promise<SubscriptionInvoiceDetail> {
    const useCases = await this.useCases.billingAccount()
    return await useCases.billingAccount.getInvoice(input)
  }

  async createPortalSession(input: { userId: string }): Promise<SubscriptionPortalSessionResult> {
    const useCases = await this.useCases.billingAccount()
    return await useCases.billingAccount.createPortalSession(input)
  }

  async ensureCustomer(input: { userId: string }): Promise<EnsureSubscriptionCustomerResult> {
    const useCases = await this.useCases.billingAccount()
    return await useCases.billingAccount.ensureCustomer(input)
  }

  async previewChange(organizationId: string, newPriceId: string): Promise<PreviewChangeResult> {
    const useCases = await this.useCases.planChanges()
    return await useCases.planChanges.previewChange({ organizationId, newPriceId })
  }

  async changePlan(
    organizationId: string,
    newPriceId: string,
    actorId?: string
  ): Promise<ChangePlanResult> {
    const useCases = await this.useCases.planChanges()
    return await useCases.planChanges.changePlan({ organizationId, newPriceId, actorId })
  }

  async cancelPendingChange(organizationId: string, actorId?: string): Promise<{ success: true }> {
    const useCases = await this.useCases.planChanges()
    return await useCases.planChanges.cancelPendingChange({ organizationId, actorId })
  }

  async subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const useCases = await this.useCases.subscribe()
    return await useCases.subscribe.subscribe(input)
  }

  async confirmSubscribe(
    input: ConfirmSubscribeInput & { actorId?: string }
  ): Promise<ConfirmSubscribeResult> {
    const useCases = await this.useCases.subscribe()
    return await useCases.subscribe.confirmSubscribe(input)
  }

  async cancel(input: CancelInput): Promise<CancelResult> {
    const useCases = await this.useCases.cancel()
    return await useCases.cancelSubscription.cancel(input)
  }

  async resume(input: ResumeInput): Promise<ResumeResult> {
    const useCases = await this.useCases.cancel()
    return await useCases.cancelSubscription.resume(input)
  }

  async getPaymentMethod(organizationId: string): Promise<PaymentMethodInfo | null> {
    const useCases = await this.useCases.paymentMethods()
    return await useCases.paymentMethods.getPaymentMethod({ organizationId })
  }

  async createSetupIntent(organizationId: string): Promise<SetupIntentResult> {
    const useCases = await this.useCases.paymentMethods()
    return await useCases.paymentMethods.createSetupIntent({ organizationId })
  }

  async updatePaymentMethod(
    input: UpdatePaymentMethodInput & { actorId?: string }
  ): Promise<UpdatePaymentMethodResult> {
    const useCases = await this.useCases.paymentMethods()
    return await useCases.paymentMethods.updatePaymentMethod(input)
  }

  async getBillingAddress(organizationId: string): Promise<BillingAddress | null> {
    const useCases = await this.useCases.billingPreferences()
    return await useCases.billingPreferences.getBillingAddress({ organizationId })
  }

  async updateBillingAddress(
    input: UpdateBillingAddressInput & { actorId?: string }
  ): Promise<BillingAddress> {
    const useCases = await this.useCases.billingPreferences()
    return await useCases.billingPreferences.updateBillingAddress(input)
  }

  async getInvoiceEmail(organizationId: string): Promise<InvoiceEmailState> {
    const useCases = await this.useCases.billingPreferences()
    return await useCases.billingPreferences.getInvoiceEmail({ organizationId })
  }

  async updateInvoiceEmail(
    organizationId: string,
    email: string,
    actorId?: string
  ): Promise<{ email: string }> {
    const useCases = await this.useCases.billingPreferences()
    return await useCases.billingPreferences.updateInvoiceEmail({
      organizationId,
      email,
      actorId,
    })
  }

  async getInvoiceLanguage(organizationId: string): Promise<InvoiceLanguageState> {
    const useCases = await this.useCases.billingPreferences()
    return await useCases.billingPreferences.getInvoiceLanguage({ organizationId })
  }

  async updateInvoiceLanguage(
    organizationId: string,
    language: string,
    actorId?: string
  ): Promise<{ language: InvoiceLanguage }> {
    const useCases = await this.useCases.billingPreferences()
    return await useCases.billingPreferences.updateInvoiceLanguage({
      organizationId,
      language,
      actorId,
    })
  }

  async handleSubscriptionUpdated(snapshot: StripeWebhookSubscriptionSnapshot): Promise<void> {
    const useCases = await this.useCases.webhooks()
    const result = await useCases.webhooks.handleSubscriptionUpdated(snapshot)
    logSkipped(result)
  }

  async handleSubscriptionDeleted(snapshot: { stripeSubscriptionId: string }): Promise<void> {
    const useCases = await this.useCases.webhooks()
    const result = await useCases.webhooks.handleSubscriptionDeleted(snapshot)
    logSkipped(result)
  }

  async handleInvoicePaymentFailed(snapshot: StripeWebhookInvoiceSnapshot): Promise<void> {
    const useCases = await this.useCases.webhooks()
    const result = await useCases.webhooks.handleInvoicePaymentFailed(snapshot)
    logSkipped(result)
  }

  async handleInvoicePaymentSucceeded(snapshot: StripeWebhookInvoiceSnapshot): Promise<void> {
    const useCases = await this.useCases.webhooks()
    const result = await useCases.webhooks.handleInvoicePaymentSucceeded(snapshot)
    logSkipped(result)
  }
}

export const subscriptionApplicationService = new SubscriptionApplicationService()
