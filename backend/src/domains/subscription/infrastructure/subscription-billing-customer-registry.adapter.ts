import type { SubscriptionCustomerRegistryPort } from '../application/ports'
import { SubscriptionBillingAccountError } from '../domain'
import {
  SubscriptionCustomerRegistryError,
  stripeOrganizationCustomerRegistry,
} from './stripe-organization-customer-registry.adapter'

export class BillingAccountCustomerRegistryAdapter implements SubscriptionCustomerRegistryPort {
  async getCustomerId(organizationId: string): Promise<string | null> {
    return await stripeOrganizationCustomerRegistry.get(organizationId)
  }

  async ensureCustomer(input: { organizationId: string; ownerEmail?: string }): Promise<string> {
    try {
      return await stripeOrganizationCustomerRegistry.ensure(input)
    } catch (error) {
      if (
        error instanceof SubscriptionCustomerRegistryError &&
        (error.code === 'ORGANIZATION_NOT_FOUND' || error.code === 'STRIPE_UNAVAILABLE')
      ) {
        throw new SubscriptionBillingAccountError(error.code, error.message)
      }
      throw error
    }
  }
}
