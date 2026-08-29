import { and, eq, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { subscription } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionPaymentMethodRepositoryPort } from '../application/ports'
import type { ActivePaymentSubscription } from '../domain'

export class DrizzleSubscriptionPaymentMethodRepository
  implements SubscriptionPaymentMethodRepositoryPort
{
  async findActiveSubscription(organizationId: string): Promise<ActivePaymentSubscription | null> {
    const rows = await db
      .select({
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
      })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, organizationId),
          or(
            eq(subscription.status, 'active'),
            eq(subscription.status, 'trialing'),
            eq(subscription.status, 'past_due')
          )
        )
      )
      .limit(1)

    return rows[0] ?? null
  }
}
