import { and, eq, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organization, subscription } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { OrganizationStatusQueryPort } from '../application/ports'
import type { OrganizationStatusRecord, OrganizationSubscriptionRecord } from '../domain'

export class DrizzleOrganizationStatusRepository implements OrganizationStatusQueryPort {
  async findOrganizationStatus(organizationId: string): Promise<OrganizationStatusRecord | null> {
    const [row] = await db
      .select({
        id: organization.id,
        name: organization.name,
        status: organization.status,
        slug: organization.slug,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return row ?? null
  }

  async findActiveSubscription(
    organizationId: string
  ): Promise<OrganizationSubscriptionRecord | null> {
    const [row] = await db
      .select({
        plan: subscription.plan,
        status: subscription.status,
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
}
