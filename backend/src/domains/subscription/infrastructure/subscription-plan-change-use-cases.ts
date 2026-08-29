import { SubscriptionPlanChangeUseCase } from '../application/subscription-plan-change.use-cases'

export interface SubscriptionPlanChangeUseCaseContainer {
  planChanges: SubscriptionPlanChangeUseCase
}

let subscriptionPlanChangeUseCases: SubscriptionPlanChangeUseCaseContainer | null = null

export async function getSubscriptionPlanChangeUseCases(): Promise<SubscriptionPlanChangeUseCaseContainer> {
  if (subscriptionPlanChangeUseCases) return subscriptionPlanChangeUseCases

  const [
    { DrizzleSubscriptionPlanChangeRepository },
    { StripeSubscriptionPlanChangeAdapter },
    { EnvSubscriptionPricingAdapter },
    { ActivitySubscriptionAdapter },
  ] = await Promise.all([
    import('./subscription-plan-change.repository'),
    import('./stripe-subscription-plan-change.adapter'),
    import('./env-subscription-pricing.adapter'),
    import('./subscription-activity.adapter'),
  ])

  subscriptionPlanChangeUseCases = {
    planChanges: new SubscriptionPlanChangeUseCase(
      new DrizzleSubscriptionPlanChangeRepository(),
      new StripeSubscriptionPlanChangeAdapter(),
      new EnvSubscriptionPricingAdapter(),
      new ActivitySubscriptionAdapter()
    ),
  }

  return subscriptionPlanChangeUseCases
}
