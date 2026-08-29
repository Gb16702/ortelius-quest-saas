import { and, eq, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { subscription } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionPlanChangeRepositoryPort } from '../application/ports'
import type { ActivePlanChangeSubscription, PlanKey } from '../domain'

export class DrizzleSubscriptionPlanChangeRepository
  implements SubscriptionPlanChangeRepositoryPort
{
  async findActiveSubscription(
    organizationId: string
  ): Promise<ActivePlanChangeSubscription | null> {
    const rows = await db
      .select({
        id: subscription.id,
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

    return rows[0] ?? null
  }

  async updatePlan(subscriptionId: string, plan: PlanKey): Promise<void> {
    await db
      .update(subscription)
      .set({
        plan,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, subscriptionId))
  }
}
