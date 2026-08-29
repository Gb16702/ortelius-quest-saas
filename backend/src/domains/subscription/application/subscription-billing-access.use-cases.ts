import {
  assertCanManageSubscriptionBilling,
  SubscriptionBillingAccountError,
  type SubscriptionBillingMembership,
} from '../domain'
import type { SubscriptionBillingAccessRepositoryPort } from './ports'

export class SubscriptionBillingAccessUseCase {
  constructor(private readonly access: SubscriptionBillingAccessRepositoryPort) {}

  async requireBillingManager(input: {
    userId: string
    organizationId?: string
  }): Promise<SubscriptionBillingMembership> {
    const membership = input.organizationId
      ? await this.access.findMembershipInOrganization({
          userId: input.userId,
          organizationId: input.organizationId,
        })
      : await this.access.findMembership(input.userId)

    if (input.organizationId && !membership) {
      throw new SubscriptionBillingAccountError(
        'INSUFFICIENT_PERMISSIONS',
        'Insufficient permissions'
      )
    }

    assertCanManageSubscriptionBilling(membership)

    return membership
  }
}
