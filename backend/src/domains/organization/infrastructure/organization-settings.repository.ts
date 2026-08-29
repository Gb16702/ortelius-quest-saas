import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import { organizationSlugAlias } from '../../../infrastructure/database/db/schemas/organization-slug-alias-schema'
import type {
  OrganizationSettingsRepositoryPort,
  OrganizationSettingsUpdate,
  OrganizationTaxIdUpdate,
} from '../application/ports'

export class DrizzleOrganizationSettingsRepository implements OrganizationSettingsRepositoryPort {
  async findSlug(organizationId: string): Promise<string | null> {
    const rows = await db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0]?.slug ?? null
  }

  async updateSettings(
    organizationId: string,
    settings: OrganizationSettingsUpdate
  ): Promise<void> {
    const updateData: Record<string, unknown> = {}

    if (settings.name !== undefined) {
      updateData.name = settings.name
    }

    if (settings.slug !== undefined) {
      updateData.slug = settings.slug
    }

    if (settings.tagline !== undefined) {
      updateData.tagline = settings.tagline
    }

    if (settings.overview !== undefined) {
      updateData.overview = settings.overview
    }

    if (settings.website !== undefined) {
      updateData.website = settings.website
    }

    if (settings.brandColor !== undefined) {
      updateData.brandColor = settings.brandColor
    }

    if (settings.font !== undefined) {
      updateData.font = settings.font
    }

    if (Object.keys(updateData).length === 0) {
      return
    }

    if (settings.slug === undefined) {
      await db.update(organization).set(updateData).where(eq(organization.id, organizationId))
      return
    }

    const nextSlug = settings.slug

    await db.transaction(async (tx) => {
      const [currentOrganization] = await tx
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1)

      const previousSlug = currentOrganization?.slug ?? null

      if (previousSlug && previousSlug !== nextSlug) {
        await tx
          .delete(organizationSlugAlias)
          .where(
            and(
              eq(organizationSlugAlias.slug, nextSlug),
              eq(organizationSlugAlias.organizationId, organizationId)
            )
          )

        await tx
          .insert(organizationSlugAlias)
          .values({
            slug: previousSlug,
            organizationId,
          })
          .onConflictDoNothing()
      }

      await tx.update(organization).set(updateData).where(eq(organization.id, organizationId))
    })
  }

  async updateTaxId(organizationId: string, taxId: OrganizationTaxIdUpdate): Promise<void> {
    await db
      .update(organization)
      .set({
        taxIdType: taxId.taxIdType,
        taxIdNumber: taxId.taxIdNumber,
      })
      .where(eq(organization.id, organizationId))
  }
}
