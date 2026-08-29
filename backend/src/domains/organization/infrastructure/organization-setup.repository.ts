import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import { legalDocument } from '../../../infrastructure/database/db/schemas/legal-document-schema'
import { organizationCategories } from '../../../infrastructure/database/db/schemas/organization-categories-schema'
import { organizationServices } from '../../../infrastructure/database/db/schemas/organization-services-schema'
import type { OrganizationSetupQueryPort } from '../application/ports'
import type { OrganizationSetupSnapshot } from '../domain'

export class DrizzleOrganizationSetupRepository implements OrganizationSetupQueryPort {
  async getSetupSnapshot(organizationId: string): Promise<OrganizationSetupSnapshot> {
    const [orgInfo, servicesCount, categoriesCount, memberCountResult, legalDocsCount] =
      await Promise.all([
        db
          .select({
            logo: organization.logo,
            tagline: organization.tagline,
            overview: organization.overview,
            taxIdType: organization.taxIdType,
            taxIdNumber: organization.taxIdNumber,
          })
          .from(organization)
          .where(eq(organization.id, organizationId))
          .limit(1),

        db
          .select({ count: sql<number>`count(*)` })
          .from(organizationServices)
          .where(eq(organizationServices.organizationId, organizationId)),

        db
          .select({ count: sql<number>`count(*)` })
          .from(organizationCategories)
          .where(eq(organizationCategories.organizationId, organizationId)),

        db
          .select({ count: sql<number>`count(*)` })
          .from(member)
          .where(eq(member.organizationId, organizationId)),

        db
          .select({ count: sql<number>`count(*)` })
          .from(legalDocument)
          .where(
            and(eq(legalDocument.organizationId, organizationId), isNull(legalDocument.deletedAt))
          ),
      ])

    const org = orgInfo[0]
    return {
      logo: org?.logo,
      tagline: org?.tagline,
      overview: org?.overview,
      taxIdType: org?.taxIdType,
      taxIdNumber: org?.taxIdNumber,
      servicesCount: Number(servicesCount[0]?.count || 0),
      cargoTypesCount: Number(categoriesCount[0]?.count || 0),
      legalDocumentsCount: Number(legalDocsCount[0]?.count || 0),
      memberCount: Number(memberCountResult[0]?.count || 0),
    }
  }
}
