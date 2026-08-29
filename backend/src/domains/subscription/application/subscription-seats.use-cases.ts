import {
  buildLegacySubscriptionSeatResult,
  buildMissingStripeSubscriptionSeatResult,
  buildNoActiveSubscriptionSeatResult,
  buildSeatUpdateError,
  buildSeatUpdateSuccess,
  calculateSeatTarget,
  determineSeatSyncDirection,
  isFixedPriceSubscription,
  parseSeatCount,
  type SeatSyncDirection,
  type SeatUpdateResult,
  type SubscriptionSeatRecord,
} from '../domain'
import type {
  StripeSubscriptionSeatPort,
  SubscriptionActivityPort,
  SubscriptionSeatRepositoryPort,
} from './ports'
import { noopSubscriptionActivity } from './subscription-activity'

export class SyncSubscriptionSeatsUseCase {
  constructor(
    private readonly subscriptions: SubscriptionSeatRepositoryPort,
    private readonly stripeSeats: StripeSubscriptionSeatPort,
    private readonly activity: SubscriptionActivityPort = noopSubscriptionActivity
  ) {}

  async increaseSeatCount(command: { organizationId: string }): Promise<SeatUpdateResult> {
    return await this.syncSeats(command.organizationId, 'increase')
  }

  async decreaseSeatCount(command: { organizationId: string }): Promise<SeatUpdateResult> {
    return await this.syncSeats(command.organizationId, 'decrease')
  }

  async reconcileSeats(command: {
    organizationId: string
    actorId?: string
  }): Promise<SeatUpdateResult> {
    const memberCount = await this.subscriptions.countOrganizationMembers(command.organizationId)
    const activeSubscription = await this.subscriptions.findActiveSubscription(
      command.organizationId
    )

    if (!activeSubscription) {
      const result = buildNoActiveSubscriptionSeatResult('No active subscription')
      this.logSeatsReconciled(command)
      return result
    }

    const direction = determineSeatSyncDirection(memberCount, activeSubscription)
    if (direction === 'none') {
      const result = {
        success: true,
        newSeatCount: parseSeatCount(activeSubscription.seats),
      }
      this.logSeatsReconciled(command)
      return result
    }

    const result = await this.syncSeats(command.organizationId, direction, {
      activeSubscription,
      memberCount,
    })
    this.logSeatsReconciled(command)

    return result
  }

  private logSeatsReconciled(command: { organizationId: string; actorId?: string }): void {
    if (!command.actorId) return

    void this.activity.logEvent({
      organizationId: command.organizationId,
      actorId: command.actorId,
      eventType: 'subscription-seats-reconciled',
      description: 'reconciled subscription seats',
    })
  }

  private async syncSeats(
    organizationId: string,
    direction: Exclude<SeatSyncDirection, 'none'>,
    cached?: { activeSubscription: SubscriptionSeatRecord; memberCount: number }
  ): Promise<SeatUpdateResult> {
    try {
      const activeSubscription =
        cached?.activeSubscription ??
        (await this.subscriptions.findActiveSubscription(organizationId))

      if (!activeSubscription) {
        return buildNoActiveSubscriptionSeatResult()
      }

      if (isFixedPriceSubscription(activeSubscription)) {
        return buildLegacySubscriptionSeatResult(activeSubscription)
      }

      if (!activeSubscription.stripeSubscriptionId) {
        return buildMissingStripeSubscriptionSeatResult()
      }

      const memberCount =
        cached?.memberCount ?? (await this.subscriptions.countOrganizationMembers(organizationId))
      const newSeatCount = calculateSeatTarget(memberCount, direction)
      const subscriptionItemId = await this.stripeSeats.getFirstSubscriptionItemId(
        activeSubscription.stripeSubscriptionId
      )

      await this.stripeSeats.updateSubscriptionItemQuantity(subscriptionItemId, newSeatCount)
      await this.subscriptions.updateSeats(activeSubscription.id, newSeatCount)

      return buildSeatUpdateSuccess(newSeatCount)
    } catch (error) {
      return buildSeatUpdateError(error)
    }
  }
}
