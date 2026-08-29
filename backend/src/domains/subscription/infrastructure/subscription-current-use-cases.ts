import { SubscriptionCurrentUseCase } from '../application/subscription-current.use-cases'

export interface SubscriptionCurrentUseCaseContainer {
  current: SubscriptionCurrentUseCase
}

let subscriptionCurrentUseCases: SubscriptionCurrentUseCaseContainer | null = null

export async function getSubscriptionCurrentUseCases(): Promise<SubscriptionCurrentUseCaseContainer> {
  if (subscriptionCurrentUseCases) return subscriptionCurrentUseCases

  const [{ DrizzleSubscriptionCurrentRepository }, { StripeSubscriptionCurrentAdapter }] =
    await Promise.all([
      import('./subscription-current.repository'),
      import('./stripe-subscription-current.adapter'),
    ])

  subscriptionCurrentUseCases = {
    current: new SubscriptionCurrentUseCase(
      new DrizzleSubscriptionCurrentRepository(),
      new StripeSubscriptionCurrentAdapter()
    ),
  }

  return subscriptionCurrentUseCases
}
