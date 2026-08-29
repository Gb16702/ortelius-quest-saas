import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { OrganizationEmailIntakeRepositoryPort } from '../application/ports'

export class DrizzleOrganizationEmailIntakeRepository
  implements OrganizationEmailIntakeRepositoryPort
{
  async findSlug(organizationId: string): Promise<string | null> {
    const [row] = await db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return row?.slug ?? null
  }

  async setEmailIntakeEnabled(organizationId: string, enabled: boolean): Promise<void> {
    await db
      .update(organization)
      .set({ emailIntakeEnabled: enabled })
      .where(eq(organization.id, organizationId))
  }
}
