import { SubscriptionBillingAccountUseCase } from '../application/subscription-billing-account.use-cases'

export interface SubscriptionBillingAccountUseCaseContainer {
  billingAccount: SubscriptionBillingAccountUseCase
}

let subscriptionBillingAccountUseCases: SubscriptionBillingAccountUseCaseContainer | null = null

export async function getSubscriptionBillingAccountUseCases(): Promise<SubscriptionBillingAccountUseCaseContainer> {
  if (subscriptionBillingAccountUseCases) return subscriptionBillingAccountUseCases

  const [
    { DrizzleSubscriptionBillingAccountRepository },
    { BillingAccountCustomerRegistryAdapter },
    { StripeSubscriptionInvoiceAdapter },
    { StripeSubscriptionPortalAdapter },
  ] = await Promise.all([
    import('./subscription-billing-account.repository'),
    import('./subscription-billing-customer-registry.adapter'),
    import('./stripe-subscription-invoice.adapter'),
    import('./stripe-subscription-portal.adapter'),
  ])

  subscriptionBillingAccountUseCases = {
    billingAccount: new SubscriptionBillingAccountUseCase(
      new DrizzleSubscriptionBillingAccountRepository(),
      new BillingAccountCustomerRegistryAdapter(),
      new StripeSubscriptionInvoiceAdapter(),
      new StripeSubscriptionPortalAdapter()
    ),
  }

  return subscriptionBillingAccountUseCases
}
