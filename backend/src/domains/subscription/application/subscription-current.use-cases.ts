import {
  buildActiveSubscriptionCurrentState,
  buildNoActiveSubscriptionCurrentState,
  buildNoOrganizationSubscriptionCurrentState,
  emptySubscriptionCurrentPriceSnapshot,
  findActiveCurrentSubscription,
  hasUsedSubscriptionTrial,
  type SubscriptionCurrentState,
} from '../domain'
import type { StripeSubscriptionCurrentPort, SubscriptionCurrentRepositoryPort } from './ports'

export class SubscriptionCurrentUseCase {
  constructor(
    private readonly subscriptions: SubscriptionCurrentRepositoryPort,
    private readonly stripeSubscriptions: StripeSubscriptionCurrentPort
  ) {}

  async getCurrent(input: { userId?: string | null }): Promise<SubscriptionCurrentState> {
    if (!input.userId) {
      return buildNoOrganizationSubscriptionCurrentState()
    }

    const organizationId = await this.subscriptions.findUserOrganizationId(input.userId)
    if (!organizationId) {
      return buildNoOrganizationSubscriptionCurrentState()
    }

    const organization = await this.subscriptions.findOrganization(organizationId)
    const subscriptions = await this.subscriptions.listSubscriptions(organizationId)
    const hasUsedTrial = hasUsedSubscriptionTrial(subscriptions)
    const activeSubscription = findActiveCurrentSubscription(subscriptions)

    if (!activeSubscription) {
      return buildNoActiveSubscriptionCurrentState({ organization, hasUsedTrial })
    }

    let priceSnapshot = emptySubscriptionCurrentPriceSnapshot()

    if (activeSubscription.stripeSubscriptionId) {
      try {
        priceSnapshot = await this.stripeSubscriptions.getPriceSnapshot(
          activeSubscription.stripeSubscriptionId
        )
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error)
      }
    }

    return buildActiveSubscriptionCurrentState({
      organization,
      subscription: activeSubscription,
      hasUsedTrial,
      priceSnapshot,
    })
  }
}
