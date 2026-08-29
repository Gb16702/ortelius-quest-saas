import { activityApplicationService } from '../../activity/activity.application'
import type { SubscriptionActivityPort } from '../application/ports'

export class ActivitySubscriptionAdapter implements SubscriptionActivityPort {
  async logEvent(input: Parameters<SubscriptionActivityPort['logEvent']>[0]): Promise<void> {
    await activityApplicationService.logEvent(input)
  }
}
