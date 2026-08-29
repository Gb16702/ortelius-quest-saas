import { and, eq, inArray, lte, ne, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization } from '../../../infrastructure/database/db/schemas/auth-schema'
import { organizationSlugAlias } from '../../../infrastructure/database/db/schemas/organization-slug-alias-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import { metricsApplicationService as metricsService } from '../../metrics/metrics.application'
import type { OrganizationShowcaseQueryPort } from '../application/ports'
import { normalizeOrganizationFont, type OrganizationShowcaseData } from '../domain'

export class DrizzleOrganizationShowcaseRepository implements OrganizationShowcaseQueryPort {
  async findBySlug(slug: string, days?: number): Promise<OrganizationShowcaseData | null> {
    const org = await this.findOrganizationByCurrentOrAliasSlug(slug)

    if (!org) {
      return null
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const { categoriesApplicationService } = await import('../../categories/categories.application')
    const { servicesApplicationService } = await import('../../services/services.application')

    const [
      memberCount,
      metrics,
      dailyMetrics,
      organizationServices,
      organizationCategories,
      totalRequests,
      respondedRequests,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(member)
        .where(eq(member.organizationId, org.id)),
      metricsService.getOrganizationMetrics(org.id),
      days ? metricsService.getOrganizationDailyMetrics(org.id, days) : null,
      servicesApplicationService.getByOrganization(org.id),
      categoriesApplicationService.getByOrganization(org.id),
      db
        .select({ count: sql<number>`count(*)` })
        .from(request)
        .where(
          and(
            eq(request.receiverOrganizationId, org.id),
            ne(request.lifecycleStatus, 'closed'),
            lte(request.createdAt, fortyEightHoursAgo)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(request)
        .where(
          and(
            eq(request.receiverOrganizationId, org.id),
            inArray(request.lifecycleStatus, ['quoted', 'invoiced', 'closed']),
            lte(request.createdAt, fortyEightHoursAgo)
          )
        ),
    ])

    const totalCount = Number(totalRequests[0]?.count || 0)
    const respondedCount = Number(respondedRequests[0]?.count || 0)
    const responseRate = totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0
    let profileViews = metrics?.totalNewVisitors || 0
    let requestsHandled = metrics?.totalRequestsReceived || 0

    if (days && dailyMetrics) {
      profileViews = dailyMetrics.reduce((sum, day) => sum + day.newVisitors, 0)
      requestsHandled = dailyMetrics.reduce((sum, day) => sum + day.requestsReceived, 0)
    }

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        tagline: org.tagline || null,
        overview: org.overview || null,
        website: org.website || null,
        brandColor: org.brandColor || null,
        font: normalizeOrganizationFont(org.font),
        createdAt: org.createdAt,
        memberCount: Number(memberCount[0]?.count || 0),
      },
      stats: {
        profileViews,
        requestsHandled,
        responseRate,
      },
      services: organizationServices,
      cargoTypes: organizationCategories,
    }
  }

  private async findOrganizationByCurrentOrAliasSlug(slug: string) {
    const [directOrg] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        tagline: organization.tagline,
        overview: organization.overview,
        website: organization.website,
        brandColor: organization.brandColor,
        font: organization.font,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)

    if (directOrg) return directOrg

    const [aliasOrg] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        tagline: organization.tagline,
        overview: organization.overview,
        website: organization.website,
        brandColor: organization.brandColor,
        font: organization.font,
        createdAt: organization.createdAt,
      })
      .from(organizationSlugAlias)
      .innerJoin(organization, eq(organizationSlugAlias.organizationId, organization.id))
      .where(eq(organizationSlugAlias.slug, slug))
      .limit(1)

    return aliasOrg ?? null
  }
}
