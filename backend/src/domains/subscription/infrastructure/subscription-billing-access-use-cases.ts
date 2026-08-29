import { SubscriptionBillingAccessUseCase } from '../application/subscription-billing-access.use-cases'

export interface SubscriptionBillingAccessUseCaseContainer {
  billingAccess: SubscriptionBillingAccessUseCase
}

let subscriptionBillingAccessUseCases: SubscriptionBillingAccessUseCaseContainer | null = null

export async function getSubscriptionBillingAccessUseCases(): Promise<SubscriptionBillingAccessUseCaseContainer> {
  if (subscriptionBillingAccessUseCases) return subscriptionBillingAccessUseCases

  const { DrizzleSubscriptionBillingAccountRepository } = await import(
    './subscription-billing-account.repository'
  )

  subscriptionBillingAccessUseCases = {
    billingAccess: new SubscriptionBillingAccessUseCase(
      new DrizzleSubscriptionBillingAccountRepository()
    ),
  }

  return subscriptionBillingAccessUseCases
}
