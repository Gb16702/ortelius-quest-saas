import { and, asc, desc, eq, inArray, like, or, type SQL, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { metricsApplicationService as metricsService } from '../../metrics/metrics.application'
import type {
  OrganizationDashboardQueryPort,
  OrganizationMemberQueryPort,
} from '../application/ports'
import type {
  NormalizedOrganizationMemberFilters,
  OrganizationDashboardMetrics,
  OrganizationDashboardOrganization,
  OrganizationMember,
} from '../domain'

export class DrizzleOrganizationMemberQueryRepository
  implements OrganizationDashboardQueryPort, OrganizationMemberQueryPort
{
  async findDashboardOrganization(
    organizationId: string
  ): Promise<OrganizationDashboardOrganization | null> {
    const [row] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return row ?? null
  }

  async getDashboardMetrics(organizationId: string): Promise<OrganizationDashboardMetrics> {
    const metrics = await metricsService.getOrganizationMetrics(organizationId)

    return {
      totalRequestsReceived: metrics?.totalRequestsReceived ?? 0,
      totalNewVisitors: metrics?.totalNewVisitors ?? 0,
    }
  }

  async countMembers(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(...this.buildMemberConditions(organizationId, filters)))

    return Number(row?.count ?? 0)
  }

  async listMembersForDashboard(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): Promise<OrganizationMember[]> {
    const baseQuery = db
      .select({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        lastSeenAt: member.lastSeenAt,
        organizationId: member.organizationId,
        userId: member.userId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(...this.buildMemberConditions(organizationId, filters)))

    const offset = (filters.page - 1) * filters.limit

    if (filters.sortBy === 'role') {
      return (await baseQuery
        .orderBy(this.buildDashboardRoleOrder(filters))
        .limit(filters.limit)
        .offset(offset)) as OrganizationMember[]
    }

    return (await baseQuery
      .orderBy(this.buildMemberOrder(filters))
      .limit(filters.limit)
      .offset(offset)) as OrganizationMember[]
  }

  async listMembersPage(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): Promise<OrganizationMember[]> {
    return (await db
      .select({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        lastSeenAt: member.lastSeenAt,
        organizationId: member.organizationId,
        userId: member.userId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(...this.buildMemberConditions(organizationId, filters)))
      .orderBy(this.buildPaginatedMemberOrder(filters))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit)) as OrganizationMember[]
  }

  private buildMemberConditions(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): SQL[] {
    const conditions: SQL[] = [eq(member.organizationId, organizationId)]

    if (filters.isEmptyRoleFilter) {
      conditions.push(sql`1 = 0`)
    } else if (filters.roleList.length === 1) {
      conditions.push(eq(member.role, filters.roleList[0]))
    } else if (filters.roleList.length > 1) {
      conditions.push(inArray(member.role, filters.roleList))
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const searchCondition = or(
        like(sql`lower(${user.name})`, `%${searchTerm}%`),
        like(sql`lower(${user.email})`, `%${searchTerm}%`)
      )

      if (searchCondition) {
        conditions.push(searchCondition)
      }
    }

    return conditions
  }

  private buildDashboardRoleOrder(filters: NormalizedOrganizationMemberFilters): SQL {
    return filters.sortOrder === 'asc'
      ? sql`CASE WHEN ${member.role} = 'member' THEN 0 WHEN ${member.role} = 'admin' THEN 1 WHEN ${member.role} = 'owner' THEN 2 ELSE 3 END`
      : sql`CASE WHEN ${member.role} = 'owner' THEN 0 WHEN ${member.role} = 'admin' THEN 1 WHEN ${member.role} = 'member' THEN 2 ELSE 3 END`
  }

  private buildMemberOrder(filters: NormalizedOrganizationMemberFilters) {
    if (filters.sortBy === 'name') {
      return filters.sortOrder === 'asc' ? asc(user.name) : desc(user.name)
    }

    return filters.sortOrder === 'asc' ? asc(member.createdAt) : desc(member.createdAt)
  }

  private buildPaginatedMemberOrder(filters: NormalizedOrganizationMemberFilters) {
    if (filters.sortBy === 'name') {
      return filters.sortOrder === 'desc' ? desc(user.name) : asc(user.name)
    }

    if (filters.sortBy === 'joinedAt') {
      return filters.sortOrder === 'asc' ? asc(member.createdAt) : desc(member.createdAt)
    }

    return asc(member.role)
  }
}
