import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { BillingOrganizationPort } from '../application/ports'

export class DrizzleSubscriptionBillingOrganizationRepository implements BillingOrganizationPort {
  async getOrganizationName(organizationId: string): Promise<string | null> {
    const rows = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0]?.name ?? null
  }
}
