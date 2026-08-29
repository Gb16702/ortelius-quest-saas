import { subscriptionApplicationService } from '../../subscription/subscription.application'
import type { OrganizationSeatReconciliationPort } from '../application/ports'

export class SubscriptionOrganizationSeatReconciliationAdapter
  implements OrganizationSeatReconciliationPort
{
  async reconcileSeats(organizationId: string): Promise<void> {
    await subscriptionApplicationService.reconcileSeats(organizationId).catch((error) => {
      console.error('[OrganizationSeatReconciliation] Failed to reconcile seats:', error)
    })
  }
}
