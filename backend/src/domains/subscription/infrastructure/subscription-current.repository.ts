import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  member,
  organization,
  subscription,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionCurrentRepositoryPort } from '../application/ports'
import type { SubscriptionCurrentOrganization, SubscriptionCurrentRecord } from '../domain'

export class DrizzleSubscriptionCurrentRepository implements SubscriptionCurrentRepositoryPort {
  async findUserOrganizationId(userId: string): Promise<string | null> {
    const rows = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    return rows[0]?.organizationId ?? null
  }

  async findOrganization(organizationId: string): Promise<SubscriptionCurrentOrganization | null> {
    const rows = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0] ?? null
  }

  async listSubscriptions(organizationId: string): Promise<SubscriptionCurrentRecord[]> {
    return await db
      .select({
        plan: subscription.plan,
        status: subscription.status,
        periodEnd: subscription.periodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      })
      .from(subscription)
      .where(eq(subscription.referenceId, organizationId))
  }
}
