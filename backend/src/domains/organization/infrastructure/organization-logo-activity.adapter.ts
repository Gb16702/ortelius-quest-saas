import { activityApplicationService } from '../../activity/activity.application'
import type { OrganizationLogoActivityPort } from '../application/ports'

export class ActivityOrganizationLogoAdapter implements OrganizationLogoActivityPort {
  async logLogoUpdated(organizationId: string, actorId: string): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId,
      actorId,
      eventType: 'organization-logo-updated',
      description: 'updated organization logo',
    })
  }

  async logLogoRemoved(organizationId: string, actorId: string): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId,
      actorId,
      eventType: 'organization-logo-removed',
      description: 'removed organization logo',
    })
  }
}
