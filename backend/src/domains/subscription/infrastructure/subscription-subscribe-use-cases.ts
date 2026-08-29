import { SubscriptionSubscribeUseCase } from '../application/subscription-subscribe.use-cases'

export interface SubscriptionSubscribeUseCaseContainer {
  subscribe: SubscriptionSubscribeUseCase
}

let subscriptionSubscribeUseCases: SubscriptionSubscribeUseCaseContainer | null = null

export async function getSubscriptionSubscribeUseCases(): Promise<SubscriptionSubscribeUseCaseContainer> {
  if (subscriptionSubscribeUseCases) return subscriptionSubscribeUseCases

  const [
    { DrizzleSubscriptionSubscribeRepository },
    { OrganizationSubscriptionCustomerRegistryAdapter },
    { StripeSubscriptionSubscribeAdapter },
    { EnvSubscriptionPricingAdapter },
    { ActivitySubscriptionAdapter },
  ] = await Promise.all([
    import('./subscription-subscribe.repository'),
    import('./subscription-customer-registry.adapter'),
    import('./stripe-subscription-subscribe.adapter'),
    import('./env-subscription-pricing.adapter'),
    import('./subscription-activity.adapter'),
  ])

  const subscriptions = new DrizzleSubscriptionSubscribeRepository()
  const customerRegistry = new OrganizationSubscriptionCustomerRegistryAdapter()
  const stripeSubscriptions = new StripeSubscriptionSubscribeAdapter()
  const pricing = new EnvSubscriptionPricingAdapter()
  const activity = new ActivitySubscriptionAdapter()

  subscriptionSubscribeUseCases = {
    subscribe: new SubscriptionSubscribeUseCase(
      subscriptions,
      customerRegistry,
      stripeSubscriptions,
      pricing,
      activity
    ),
  }

  return subscriptionSubscribeUseCases
}
