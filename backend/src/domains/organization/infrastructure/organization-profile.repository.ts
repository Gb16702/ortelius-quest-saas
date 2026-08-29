import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import { organizationSlugAlias } from '../../../infrastructure/database/db/schemas/organization-slug-alias-schema'
import type { OrganizationProfileQueryPort } from '../application/ports'
import type { OrganizationInfo, OrganizationProfile } from '../domain'
import { normalizeOrganizationFont } from '../domain'

export class DrizzleOrganizationProfileRepository implements OrganizationProfileQueryPort {
  async findBySlug(slug: string): Promise<OrganizationProfile | null> {
    const [directRow] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        brandLogo: organization.brandLogo,
        tagline: organization.tagline,
        overview: organization.overview,
        website: organization.website,
        metadata: organization.metadata,
        createdAt: organization.createdAt,
        brandColor: organization.brandColor,
        font: organization.font,
      })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)

    const row = directRow ?? (await this.findBySlugAlias(slug))

    return row
      ? {
          ...row,
          font: normalizeOrganizationFont(row.font),
        }
      : null
  }

  private async findBySlugAlias(slug: string) {
    const [row] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        brandLogo: organization.brandLogo,
        tagline: organization.tagline,
        overview: organization.overview,
        website: organization.website,
        metadata: organization.metadata,
        createdAt: organization.createdAt,
        brandColor: organization.brandColor,
        font: organization.font,
      })
      .from(organizationSlugAlias)
      .innerJoin(organization, eq(organizationSlugAlias.organizationId, organization.id))
      .where(eq(organizationSlugAlias.slug, slug))
      .limit(1)

    return row ?? null
  }

  async findInfo(organizationId: string): Promise<OrganizationInfo | null> {
    const [row] = await db
      .select({
        id: organization.id,
        name: organization.name,
        tagline: organization.tagline,
        overview: organization.overview,
        website: organization.website,
        logo: organization.logo,
        brandLogo: organization.brandLogo,
        slug: organization.slug,
        metadata: organization.metadata,
        createdAt: organization.createdAt,
        taxIdType: organization.taxIdType,
        taxIdNumber: organization.taxIdNumber,
        emailIntakeEnabled: organization.emailIntakeEnabled,
        brandColor: organization.brandColor,
        font: organization.font,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return row
      ? {
          ...row,
          font: normalizeOrganizationFont(row.font),
        }
      : null
  }
}
