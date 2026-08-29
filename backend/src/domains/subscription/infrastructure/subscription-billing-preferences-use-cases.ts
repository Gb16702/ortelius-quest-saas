import { SubscriptionBillingPreferencesUseCase } from '../application/subscription-billing-preferences.use-cases'

export interface SubscriptionBillingPreferencesUseCaseContainer {
  billingPreferences: SubscriptionBillingPreferencesUseCase
}

let subscriptionBillingPreferencesUseCases: SubscriptionBillingPreferencesUseCaseContainer | null =
  null

export async function getSubscriptionBillingPreferencesUseCases(): Promise<SubscriptionBillingPreferencesUseCaseContainer> {
  if (subscriptionBillingPreferencesUseCases) return subscriptionBillingPreferencesUseCases

  const [
    { OrganizationSubscriptionCustomerRegistryAdapter },
    { StripeBillingPreferencesAdapter },
    { DrizzleSubscriptionBillingOrganizationRepository },
    { ActivitySubscriptionAdapter },
  ] = await Promise.all([
    import('./subscription-customer-registry.adapter'),
    import('./stripe-billing-preferences.adapter'),
    import('./subscription-billing-organization.repository'),
    import('./subscription-activity.adapter'),
  ])

  const customerRegistry = new OrganizationSubscriptionCustomerRegistryAdapter()
  const billingPreferences = new StripeBillingPreferencesAdapter()
  const organizations = new DrizzleSubscriptionBillingOrganizationRepository()
  const activity = new ActivitySubscriptionAdapter()

  subscriptionBillingPreferencesUseCases = {
    billingPreferences: new SubscriptionBillingPreferencesUseCase(
      customerRegistry,
      billingPreferences,
      organizations,
      activity
    ),
  }

  return subscriptionBillingPreferencesUseCases
}
