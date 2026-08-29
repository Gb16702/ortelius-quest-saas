import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  member,
  organization,
  subscription,
  user,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import type { CheckoutSubscriptionRecord } from '../application/checkout-models'
import type { CheckoutPersistencePort } from '../application/ports'

export class DrizzleCheckoutRepository implements CheckoutPersistencePort {
  async findUserIdByEmail(email: string): Promise<string | null> {
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

    return existingUser[0]?.id ?? null
  }

  async userHasOrganizationMembership(userId: string): Promise<boolean> {
    const existingMembership = await db
      .select({ id: member.id })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    return existingMembership.length > 0
  }

  async findOrganizationById(
    organizationId: string
  ): Promise<{ organizationId: string; slug: string } | null> {
    const existingOrganization = await db
      .select({ organizationId: organization.id, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    const record = existingOrganization[0]
    if (!record?.slug) return null

    return { organizationId: record.organizationId, slug: record.slug }
  }

  async userOwnsOrganization(userId: string, organizationId: string): Promise<boolean> {
    const existingMembership = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, organizationId),
          eq(member.role, 'owner')
        )
      )
      .limit(1)

    return existingMembership.length > 0
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await db.update(user).set({ stripeCustomerId }).where(eq(user.id, userId))
  }

  async createOrganization(input: {
    id: string
    name: string
    slug: string
    stripeCustomerId: string
    createdAt: Date
  }): Promise<void> {
    await db.insert(organization).values({
      id: input.id,
      name: input.name,
      slug: input.slug,
      status: 'active',
      stripeCustomerId: input.stripeCustomerId,
      createdAt: input.createdAt,
    })
  }

  async createOwnerMembership(input: {
    id: string
    organizationId: string
    userId: string
    createdAt: Date
  }): Promise<void> {
    await db.insert(member).values({
      id: input.id,
      organizationId: input.organizationId,
      userId: input.userId,
      role: 'owner',
      createdAt: input.createdAt,
    })
  }

  async createSubscriptionRecord(record: CheckoutSubscriptionRecord): Promise<void> {
    await db.insert(subscription).values(record)
  }
}
