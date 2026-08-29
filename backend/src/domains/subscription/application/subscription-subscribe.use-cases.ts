import {
  assertCanStartSubscription,
  assertKnownPricePlan,
  assertOrganizationFound,
  assertSubscriptionBelongsToOrganization,
  assertSubscriptionIsActive,
  assertUserFound,
  buildConfirmedSubscriptionRecord,
  buildConfirmSubscribeResult,
  buildSubscribeResult,
  type ConfirmSubscribeInput,
  type ConfirmSubscribeResult,
  type SubscribeInput,
  type SubscribeResult,
} from '../domain'
import type {
  StripeSubscriptionSubscribePort,
  SubscriptionActivityPort,
  SubscriptionCustomerRegistryPort,
  SubscriptionPricingPort,
  SubscriptionSubscribeRepositoryPort,
} from './ports'
import { noopSubscriptionActivity } from './subscription-activity'

export class SubscriptionSubscribeUseCase {
  constructor(
    private readonly subscriptions: SubscriptionSubscribeRepositoryPort,
    private readonly customerRegistry: SubscriptionCustomerRegistryPort,
    private readonly stripeSubscriptions: StripeSubscriptionSubscribePort,
    private readonly pricing: SubscriptionPricingPort,
    private readonly activity: SubscriptionActivityPort = noopSubscriptionActivity
  ) {}

  async subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const plan = this.pricing.resolvePlan(input.priceId)
    assertKnownPricePlan(plan)

    assertCanStartSubscription(await this.subscriptions.hasActiveSubscription(input.organizationId))

    const organization = await this.subscriptions.findOrganization(input.organizationId)
    assertOrganizationFound(organization)

    const user = await this.subscriptions.findUser(input.userId)
    assertUserFound(user)

    const customerId = await this.customerRegistry.ensureCustomer({
      organizationId: input.organizationId,
      ownerEmail: user.email,
    })
    const stripeSubscription = await this.stripeSubscriptions.createSubscription({
      customerId,
      organizationId: input.organizationId,
      userId: input.userId,
      priceId: input.priceId,
    })

    return buildSubscribeResult(stripeSubscription)
  }

  async confirmSubscribe(
    input: ConfirmSubscribeInput & { actorId?: string }
  ): Promise<ConfirmSubscribeResult> {
    const stripeSubscription = await this.stripeSubscriptions.retrieveSubscription(
      input.subscriptionId
    )

    assertSubscriptionBelongsToOrganization(stripeSubscription, input.organizationId)
    assertSubscriptionIsActive(stripeSubscription)

    const plan = this.pricing.resolvePlan(stripeSubscription.priceId)
    assertKnownPricePlan(plan, 'Subscription is on an unknown price.')

    if (await this.subscriptions.hasStripeSubscription(stripeSubscription.id)) {
      const result = buildConfirmSubscribeResult(plan, stripeSubscription.id)
      this.logSubscriptionCreated(input, result)
      return result
    }

    await this.subscriptions.createSubscription(
      buildConfirmedSubscriptionRecord(plan, input.organizationId, stripeSubscription)
    )

    const result = buildConfirmSubscribeResult(plan, stripeSubscription.id)
    this.logSubscriptionCreated(input, result)

    return result
  }

  private logSubscriptionCreated(
    input: ConfirmSubscribeInput & { actorId?: string },
    result: ConfirmSubscribeResult
  ): void {
    if (!input.actorId) return

    void this.activity.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: 'subscription-created',
      description: `subscription started (${result.plan})`,
    })
  }
}
