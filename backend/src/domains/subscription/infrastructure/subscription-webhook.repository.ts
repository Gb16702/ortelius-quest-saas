import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { subscription } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionWebhookRepositoryPort } from '../application/ports'
import type { StripeWebhookSubscriptionSnapshot, SubscriptionWebhookRecord } from '../domain'

export class DrizzleSubscriptionWebhookRepository implements SubscriptionWebhookRepositoryPort {
  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<SubscriptionWebhookRecord | null> {
    const rows = await db
      .select({ id: subscription.id, status: subscription.status })
      .from(subscription)
      .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)

    return rows[0] ?? null
  }

  async updateFromStripeSubscription(snapshot: StripeWebhookSubscriptionSnapshot): Promise<void> {
    await db
      .update(subscription)
      .set({
        status: snapshot.status,
        seats: snapshot.seats.toString(),
        periodEnd: snapshot.periodEnd,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscription.stripeSubscriptionId, snapshot.stripeSubscriptionId))
  }

  async markCanceled(stripeSubscriptionId: string): Promise<void> {
    await db
      .update(subscription)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
  }

  async markPastDue(stripeSubscriptionId: string): Promise<void> {
    await db
      .update(subscription)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
  }

  async markActive(stripeSubscriptionId: string): Promise<void> {
    await db
      .update(subscription)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
  }
}
