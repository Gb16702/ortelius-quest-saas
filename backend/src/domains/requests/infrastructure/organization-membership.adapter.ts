import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { OrganizationMembershipPort } from '../application/ports'

export class OrganizationMembershipAdapter implements OrganizationMembershipPort {
  async hasMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    return membership.length > 0
  }
}
