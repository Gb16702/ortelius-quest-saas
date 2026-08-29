import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { QuoteOrganizationResolverPort } from '../application/ports'

export class QuoteOrganizationResolverAdapter implements QuoteOrganizationResolverPort {
  async resolveOrganizationIdForUser(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    return row?.organizationId ?? null
  }
}
