import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { OrganizationLogoRepositoryPort } from '../application/ports'
import type { OrganizationLogoSnapshot } from '../domain'

export class DrizzleOrganizationLogoRepository implements OrganizationLogoRepositoryPort {
  async findLogo(organizationId: string): Promise<OrganizationLogoSnapshot | null> {
    const [row] = await db
      .select({ logo: organization.logo })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return row ?? null
  }

  async setLogo(organizationId: string, logoUrl: string): Promise<void> {
    await db.update(organization).set({ logo: logoUrl }).where(eq(organization.id, organizationId))
  }

  async clearLogo(organizationId: string): Promise<void> {
    await db.update(organization).set({ logo: null }).where(eq(organization.id, organizationId))
  }
}
