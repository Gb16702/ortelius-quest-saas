import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { AuthMembership, Organization } from '../application/auth-models'
import type { AuthRepositoryPort } from '../application/ports'

export class DrizzleAuthRepository implements AuthRepositoryPort {
  async checkUserExistsByEmail(email: string): Promise<boolean> {
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

    return existingUser.length > 0
  }

  async getUserOrganizationMembership(
    userId: string,
    organizationId: string
  ): Promise<AuthMembership | null> {
    const membership = await db
      .select({
        role: member.role,
        organizationId: member.organizationId,
        organizationName: organization.name,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    return membership.length > 0 ? membership[0] : null
  }

  async validateOrganizationExists(organizationId: string): Promise<Organization | null> {
    const org = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return org.length > 0 ? org[0] : null
  }
}
