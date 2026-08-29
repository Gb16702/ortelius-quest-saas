import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { OrganizationMembershipPort } from '../application/ports'

export class DrizzleOrganizationMembershipAdapter implements OrganizationMembershipPort {
  async findOrganizationIdForUser(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    return row?.organizationId ?? null
  }
}
