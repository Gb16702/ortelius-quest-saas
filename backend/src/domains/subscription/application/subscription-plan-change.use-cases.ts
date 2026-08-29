import {
  assertActiveSubscriptionLinked,
  assertKnownPlanPrice,
  assertPendingChangeCanceled,
  assertPlanWillChange,
  assertSubscriptionHasItem,
  buildChangePlanResult,
  buildDowngradePreview,
  buildPreviewChangeBase,
  buildUpgradePreview,
  type ChangePlanResult,
  type PreviewChangeResult,
  resolvePlanChangeDirection,
  todayIsoDate,
} from '../domain'
import type {
  StripeSubscriptionPlanChangePort,
  SubscriptionActivityPort,
  SubscriptionPlanChangePricingPort,
  SubscriptionPlanChangeRepositoryPort,
} from './ports'
import { noopSubscriptionActivity } from './subscription-activity'

export class SubscriptionPlanChangeUseCase {
  constructor(
    private readonly subscriptions: SubscriptionPlanChangeRepositoryPort,
    private readonly stripePlanChanges: StripeSubscriptionPlanChangePort,
    private readonly pricing: SubscriptionPlanChangePricingPort,
    private readonly activity: SubscriptionActivityPort = noopSubscriptionActivity
  ) {}

  async previewChange(command: {
    organizationId: string
    newPriceId: string
  }): Promise<PreviewChangeResult> {
    const targetPlan = this.pricing.resolvePlanPrice(command.newPriceId)
    assertKnownPlanPrice(targetPlan)

    const activeSubscription = await this.subscriptions.findActiveSubscription(
      command.organizationId
    )
    assertActiveSubscriptionLinked(activeSubscription)

    const stripeSubscription = await this.stripePlanChanges.retrieveSubscription(
      activeSubscription.stripeSubscriptionId
    )
    assertSubscriptionHasItem(stripeSubscription)
    assertPlanWillChange(stripeSubscription.currentPriceId, command.newPriceId)

    const currentPlan = this.pricing.resolvePlanPrice(stripeSubscription.currentPriceId)
    assertKnownPlanPrice(currentPlan, 'Current subscription is on an unknown price')

    const newStripePrice = await this.stripePlanChanges.retrievePrice(command.newPriceId)
    const direction = resolvePlanChangeDirection(currentPlan.key, targetPlan.key)
    const base = buildPreviewChangeBase({
      targetPlan,
      currentPlan,
      newPrice: newStripePrice.amount,
      nextBillingDate: stripeSubscription.nextBillingDate,
      currency: newStripePrice.currency,
    })

    if (direction === 'downgrade') {
      return buildDowngradePreview(base)
    }

    const preview = await this.stripePlanChanges.createUpgradePreview({
      customerId: stripeSubscription.customerId,
      subscriptionId: stripeSubscription.id,
      itemId: stripeSubscription.currentItemId,
      newPriceId: command.newPriceId,
    })
    const paymentMethod =
      stripeSubscription.defaultPaymentMethod ??
      (await this.stripePlanChanges.findCustomerDefaultCardPaymentMethod(
        stripeSubscription.customerId
      ))

    return buildUpgradePreview(base, preview, paymentMethod)
  }

  async changePlan(command: {
    organizationId: string
    newPriceId: string
    actorId?: string
  }): Promise<ChangePlanResult> {
    const targetPlan = this.pricing.resolvePlanPrice(command.newPriceId)
    assertKnownPlanPrice(targetPlan)

    const activeSubscription = await this.subscriptions.findActiveSubscription(
      command.organizationId
    )
    assertActiveSubscriptionLinked(activeSubscription)

    const stripeSubscription = await this.stripePlanChanges.retrieveSubscription(
      activeSubscription.stripeSubscriptionId
    )
    assertSubscriptionHasItem(stripeSubscription)
    assertPlanWillChange(stripeSubscription.currentPriceId, command.newPriceId)

    const currentPlan = this.pricing.resolvePlanPrice(stripeSubscription.currentPriceId)
    assertKnownPlanPrice(currentPlan, 'Current subscription is on an unknown price')

    const direction = resolvePlanChangeDirection(currentPlan.key, targetPlan.key)

    await this.stripePlanChanges.releaseExistingScheduleIfAny(stripeSubscription.scheduleId)

    if (direction === 'upgrade') {
      await this.stripePlanChanges.upgradeSubscription({
        subscriptionId: stripeSubscription.id,
        itemId: stripeSubscription.currentItemId,
        newPriceId: command.newPriceId,
      })
      await this.subscriptions.updatePlan(activeSubscription.id, targetPlan.key)

      const result = buildChangePlanResult({
        subscriptionId: stripeSubscription.id,
        direction,
        effectiveAt: todayIsoDate(),
      })
      await this.logPlanChanged(command, result)

      return result
    }

    const effectiveAt = await this.stripePlanChanges.scheduleDowngrade({
      subscriptionId: stripeSubscription.id,
      itemId: stripeSubscription.currentItemId,
      newPriceId: command.newPriceId,
      quantity: stripeSubscription.quantity,
    })

    const result = buildChangePlanResult({
      subscriptionId: stripeSubscription.id,
      direction,
      effectiveAt,
    })
    await this.logPlanChanged(command, result)

    return result
  }

  async cancelPendingChange(command: {
    organizationId: string
    actorId?: string
  }): Promise<{ success: true }> {
    const activeSubscription = await this.subscriptions.findActiveSubscription(
      command.organizationId
    )
    assertActiveSubscriptionLinked(activeSubscription)

    const stripeSubscription = await this.stripePlanChanges.retrieveSubscription(
      activeSubscription.stripeSubscriptionId
    )
    const canceled = await this.stripePlanChanges.cancelPendingSchedule(
      stripeSubscription.scheduleId
    )

    assertPendingChangeCanceled(canceled)

    if (command.actorId) {
      void this.activity.logEvent({
        organizationId: command.organizationId,
        actorId: command.actorId,
        eventType: 'subscription-pending-change-canceled',
        description: 'canceled pending plan change',
      })
    }

    return { success: true }
  }

  private async logPlanChanged(
    command: { organizationId: string; actorId?: string },
    result: ChangePlanResult
  ): Promise<void> {
    if (!command.actorId) return

    await this.activity.logEvent({
      organizationId: command.organizationId,
      actorId: command.actorId,
      eventType: 'subscription-plan-changed',
      description: `plan changed (${result.direction}, effective ${result.effectiveAt})`,
    })
  }
}
