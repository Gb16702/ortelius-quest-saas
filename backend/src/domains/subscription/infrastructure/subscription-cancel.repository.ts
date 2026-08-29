import { and, eq, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  subscription,
  subscriptionCancellationFeedback,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionCancelRepositoryPort } from '../application/ports'
import type { CancellationFeedbackInput, SubscriptionCancelRecord } from '../domain'

export class DrizzleSubscriptionCancelRepository implements SubscriptionCancelRepositoryPort {
  async findActiveSubscription(organizationId: string): Promise<SubscriptionCancelRecord | null> {
    const [row] = await db
      .select({
        id: subscription.id,
        plan: subscription.plan,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        periodEnd: subscription.periodEnd,
      })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, organizationId),
          or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing'))
        )
      )
      .limit(1)

    if (!row) return null

    return {
      ...row,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
    }
  }

  async scheduleCancellation(subscriptionId: string, periodEnd: Date | null): Promise<void> {
    await db
      .update(subscription)
      .set({
        cancelAtPeriodEnd: true,
        periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, subscriptionId))
  }

  async resumeCancellation(subscriptionId: string): Promise<void> {
    await db
      .update(subscription)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, subscriptionId))
  }

  async recordCancellationFeedback(feedback: CancellationFeedbackInput): Promise<void> {
    await db.insert(subscriptionCancellationFeedback).values({
      id: crypto.randomUUID(),
      subscriptionId: feedback.subscriptionId,
      organizationId: feedback.organizationId,
      userId: feedback.userId,
      reason: feedback.reason,
      feedback: feedback.feedback,
      createdAt: new Date(),
    })
  }
}
