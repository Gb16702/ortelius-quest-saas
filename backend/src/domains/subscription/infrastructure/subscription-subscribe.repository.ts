import { and, eq, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  organization,
  subscription,
  user,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import type { SubscriptionSubscribeRepositoryPort } from '../application/ports'
import type {
  ConfirmedSubscriptionRecord,
  SubscribeOrganizationRecord,
  SubscribeUserRecord,
} from '../domain'

export class DrizzleSubscriptionSubscribeRepository implements SubscriptionSubscribeRepositoryPort {
  async hasActiveSubscription(organizationId: string): Promise<boolean> {
    const rows = await db
      .select({ id: subscription.id })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, organizationId),
          or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing'))
        )
      )
      .limit(1)

    return rows.length > 0
  }

  async findOrganization(organizationId: string): Promise<SubscribeOrganizationRecord | null> {
    const rows = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0] ?? null
  }

  async findUser(userId: string): Promise<SubscribeUserRecord | null> {
    const rows = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return rows[0] ?? null
  }

  async hasStripeSubscription(stripeSubscriptionId: string): Promise<boolean> {
    const rows = await db
      .select({ id: subscription.id })
      .from(subscription)
      .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)

    return rows.length > 0
  }

  async createSubscription(record: ConfirmedSubscriptionRecord): Promise<void> {
    const now = new Date()
    await db.insert(subscription).values({
      id: crypto.randomUUID(),
      plan: record.plan,
      referenceId: record.organizationId,
      stripeCustomerId: record.stripeCustomerId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      status: record.status,
      seats: record.seats,
      billingModel: record.billingModel,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      trialStart: record.trialStart,
      trialEnd: record.trialEnd,
      createdAt: now,
      updatedAt: now,
    })
  }
}
