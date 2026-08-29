import {
  assertPaymentMethodBelongsToCustomer,
  assertPaymentMethodExists,
  buildSetupIntentResult,
  buildUpdatePaymentMethodResult,
  type PaymentMethodInfo,
  type SetupIntentResult,
  shouldAttachPaymentMethod,
  shouldDetachPreviousPaymentMethod,
  shouldRetryLatestOpenInvoice,
  type UpdatePaymentMethodInput,
  type UpdatePaymentMethodResult,
} from '../domain'
import type {
  StripePaymentMethodPort,
  SubscriptionActivityPort,
  SubscriptionCustomerRegistryPort,
  SubscriptionPaymentMethodRepositoryPort,
} from './ports'
import { noopSubscriptionActivity } from './subscription-activity'

export class SubscriptionPaymentMethodUseCase {
  constructor(
    private readonly customerRegistry: SubscriptionCustomerRegistryPort,
    private readonly paymentMethods: StripePaymentMethodPort,
    private readonly subscriptions: SubscriptionPaymentMethodRepositoryPort,
    private readonly activity: SubscriptionActivityPort = noopSubscriptionActivity
  ) {}

  async getPaymentMethod(command: { organizationId: string }): Promise<PaymentMethodInfo | null> {
    const customerId = await this.customerRegistry.getCustomerId(command.organizationId)
    if (!customerId) return null

    return await this.paymentMethods.getDefaultPaymentMethod(customerId)
  }

  async createSetupIntent(command: { organizationId: string }): Promise<SetupIntentResult> {
    const customerId = await this.customerRegistry.ensureCustomer({
      organizationId: command.organizationId,
    })
    const activeSubscription = await this.subscriptions.findActiveSubscription(
      command.organizationId
    )
    const clientSecret = await this.paymentMethods.createSetupIntent({
      customerId,
      organizationId: command.organizationId,
      subscriptionId: activeSubscription?.stripeSubscriptionId ?? null,
    })

    return buildSetupIntentResult(clientSecret)
  }

  async updatePaymentMethod(
    input: UpdatePaymentMethodInput & { actorId?: string }
  ): Promise<UpdatePaymentMethodResult> {
    const customerId = await this.customerRegistry.ensureCustomer({
      organizationId: input.organizationId,
    })
    const paymentMethod = await this.paymentMethods.retrievePaymentMethod(input.paymentMethodId)

    assertPaymentMethodExists(paymentMethod)
    assertPaymentMethodBelongsToCustomer(paymentMethod, customerId)

    if (shouldAttachPaymentMethod(paymentMethod)) {
      await this.paymentMethods.attachPaymentMethod(input.paymentMethodId, customerId)
    }

    const previousPaymentMethodId = await this.paymentMethods.setCustomerDefaultPaymentMethod(
      customerId,
      input.paymentMethodId
    )
    const activeSubscription = await this.subscriptions.findActiveSubscription(input.organizationId)

    if (activeSubscription?.stripeSubscriptionId) {
      await this.paymentMethods.setSubscriptionDefaultPaymentMethod(
        activeSubscription.stripeSubscriptionId,
        input.paymentMethodId
      )
    }

    if (shouldRetryLatestOpenInvoice(activeSubscription)) {
      await this.paymentMethods.retryLatestOpenInvoice(customerId, input.paymentMethodId)
    }

    if (shouldDetachPreviousPaymentMethod(previousPaymentMethodId, input.paymentMethodId)) {
      await this.paymentMethods.detachPaymentMethod(previousPaymentMethodId)
    }

    const result = buildUpdatePaymentMethodResult(paymentMethod)

    if (input.actorId) {
      void this.activity.logEvent({
        organizationId: input.organizationId,
        actorId: input.actorId,
        eventType: 'subscription-payment-method-updated',
        description: 'updated default payment method',
      })
    }

    return result
  }
}
