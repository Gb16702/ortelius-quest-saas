import { and, eq, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  member,
  organization,
  subscription,
  user as userTable,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionBillingAccessRepositoryPort } from '../application/ports'
import type { SubscriptionBillingMembership } from '../domain'

export class DrizzleSubscriptionBillingAccountRepository
  implements SubscriptionBillingAccessRepositoryPort
{
  async findMembership(userId: string): Promise<SubscriptionBillingMembership | null> {
    const rows = await db
      .select({
        organizationId: member.organizationId,
        role: member.role,
      })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    return rows[0] ?? null
  }

  async findMembershipInOrganization(input: {
    userId: string
    organizationId: string
  }): Promise<SubscriptionBillingMembership | null> {
    const rows = await db
      .select({
        organizationId: member.organizationId,
        role: member.role,
      })
      .from(member)
      .where(and(eq(member.organizationId, input.organizationId), eq(member.userId, input.userId)))
      .limit(1)

    return rows[0] ?? null
  }

  async findUserEmail(userId: string): Promise<string | null> {
    const rows = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)

    return rows[0]?.email ?? null
  }

  async findActiveSubscriptionCustomerId(organizationId: string): Promise<string | null> {
    const rows = await db
      .select({
        stripeCustomerId: subscription.stripeCustomerId,
      })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, organizationId),
          or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing'))
        )
      )
      .limit(1)

    return rows[0]?.stripeCustomerId ?? null
  }

  async findOrganizationSlug(organizationId: string): Promise<string | null | undefined> {
    const rows = await db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0]?.slug
  }
}
