import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import type {
  OrganizationMembershipQueryPort,
  OrganizationMembershipRecord,
  OrganizationMemberUserIdsQueryPort,
  UserOrganizationRecord,
  UserOrganizationsQueryPort,
} from '../application/ports'

export class DrizzleOrganizationMembershipRepository
  implements
    OrganizationMembershipQueryPort,
    OrganizationMemberUserIdsQueryPort,
    UserOrganizationsQueryPort
{
  async findMembership(
    userId: string,
    organizationId: string
  ): Promise<OrganizationMembershipRecord | null> {
    const [row] = await db
      .select({
        id: member.id,
        role: member.role,
        organizationId: member.organizationId,
        userId: member.userId,
      })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    return row ?? null
  }

  async listMemberUserIds(organizationId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, organizationId))

    return rows.map((row) => row.userId)
  }

  async listUserOrganizations(userId: string): Promise<UserOrganizationRecord[]> {
    return await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: member.role,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
  }
}
