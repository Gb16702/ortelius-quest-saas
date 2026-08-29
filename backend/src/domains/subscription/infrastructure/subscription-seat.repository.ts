import { and, eq, or, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, subscription } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionSeatRepositoryPort } from '../application/ports'
import type { SubscriptionSeatRecord } from '../domain'

export class DrizzleSubscriptionSeatRepository implements SubscriptionSeatRepositoryPort {
  async findActiveSubscription(organizationId: string): Promise<SubscriptionSeatRecord | null> {
    const [row] = await db
      .select({
        id: subscription.id,
        seats: subscription.seats,
        billingModel: subscription.billingModel,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, organizationId),
          or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing'))
        )
      )
      .limit(1)

    return row ?? null
  }

  async countOrganizationMembers(organizationId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(member)
      .where(eq(member.organizationId, organizationId))

    return Number(row?.count) || 0
  }

  async updateSeats(subscriptionId: string, seats: number): Promise<void> {
    await db
      .update(subscription)
      .set({
        seats: seats.toString(),
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, subscriptionId))
  }
}
