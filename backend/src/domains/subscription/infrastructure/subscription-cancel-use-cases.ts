import { SubscriptionCancelUseCase } from '../application/subscription-cancel.use-cases'

export interface SubscriptionCancelUseCaseContainer {
  cancelSubscription: SubscriptionCancelUseCase
}

let subscriptionCancelUseCases: SubscriptionCancelUseCaseContainer | null = null

export async function getSubscriptionCancelUseCases(): Promise<SubscriptionCancelUseCaseContainer> {
  if (subscriptionCancelUseCases) return subscriptionCancelUseCases

  const [
    { DrizzleSubscriptionCancelRepository },
    { StripeSubscriptionCancelAdapter },
    { ActivitySubscriptionAdapter },
  ] = await Promise.all([
    import('./subscription-cancel.repository'),
    import('./stripe-subscription-cancel.adapter'),
    import('./subscription-activity.adapter'),
  ])

  const subscriptions = new DrizzleSubscriptionCancelRepository()
  const stripeSubscriptions = new StripeSubscriptionCancelAdapter()
  const activity = new ActivitySubscriptionAdapter()

  subscriptionCancelUseCases = {
    cancelSubscription: new SubscriptionCancelUseCase(subscriptions, stripeSubscriptions, activity),
  }

  return subscriptionCancelUseCases
}
