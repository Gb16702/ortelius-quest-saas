import type { SubscriptionActivityPort } from './ports'

export const noopSubscriptionActivity: SubscriptionActivityPort = {
  async logEvent() {
    return undefined
  },
}
