import type { SubscriptionCustomerRegistryPort } from '../application/ports'
import { stripeOrganizationCustomerRegistry } from './stripe-organization-customer-registry.adapter'

export class OrganizationSubscriptionCustomerRegistryAdapter
  implements SubscriptionCustomerRegistryPort
{
  async getCustomerId(organizationId: string): Promise<string | null> {
    return await stripeOrganizationCustomerRegistry.get(organizationId)
  }

  async ensureCustomer(input: { organizationId: string; ownerEmail?: string }): Promise<string> {
    return await stripeOrganizationCustomerRegistry.ensure(input)
  }
}
