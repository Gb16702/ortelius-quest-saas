import { SubscriptionPaymentMethodUseCase } from '../application/subscription-payment-method.use-cases'

export interface SubscriptionPaymentMethodUseCaseContainer {
  paymentMethods: SubscriptionPaymentMethodUseCase
}

let subscriptionPaymentMethodUseCases: SubscriptionPaymentMethodUseCaseContainer | null = null

export async function getSubscriptionPaymentMethodUseCases(): Promise<SubscriptionPaymentMethodUseCaseContainer> {
  if (subscriptionPaymentMethodUseCases) return subscriptionPaymentMethodUseCases

  const [
    { OrganizationSubscriptionCustomerRegistryAdapter },
    { StripePaymentMethodAdapter },
    { DrizzleSubscriptionPaymentMethodRepository },
    { ActivitySubscriptionAdapter },
  ] = await Promise.all([
    import('./subscription-customer-registry.adapter'),
    import('./stripe-payment-method.adapter'),
    import('./subscription-payment-method.repository'),
    import('./subscription-activity.adapter'),
  ])

  const customerRegistry = new OrganizationSubscriptionCustomerRegistryAdapter()
  const paymentMethods = new StripePaymentMethodAdapter()
  const subscriptions = new DrizzleSubscriptionPaymentMethodRepository()
  const activity = new ActivitySubscriptionAdapter()

  subscriptionPaymentMethodUseCases = {
    paymentMethods: new SubscriptionPaymentMethodUseCase(
      customerRegistry,
      paymentMethods,
      subscriptions,
      activity
    ),
  }

  return subscriptionPaymentMethodUseCases
}
