import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { category } from '../../../infrastructure/database/db/schemas/category-schema'
import {
  type ERequestClosedReason,
  type ERequestLifecycleStatus,
  request as requestTable,
} from '../../../infrastructure/database/db/schemas/request-schema'
import { service } from '../../../infrastructure/database/db/schemas/services-schema'
import type {
  RequestOrganizationFilters,
  RequestOrganizationQueryPort,
  RequestOrganizationRequestsAggregationResult,
  RequestOrganizationRequestsResult,
} from '../application/ports'
import { calculateRequestPriority, PRIORITY_THRESHOLDS } from '../domain/request-priority'

export class RequestOrganizationQueryAdapter implements RequestOrganizationQueryPort {
  async getUserOrganizations(userId: string): Promise<Array<{ id: string }>> {
    return await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: member.role,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
  }

  async getOrganizationRequests(
    organizationId: string,
    userId: string,
    filters?: RequestOrganizationFilters
  ): Promise<RequestOrganizationRequestsResult> {
    const {
      lifecycleStatus,
      closedReason,
      search,
      assignedTo,
      priority,
      sortOrder = 'desc',
      page = 1,
      limit: rawLimit = 10,
      fromDate,
      toDate,
    } = filters || {}
    const limit = Math.min(rawLimit, 100)

    const membership = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
      .limit(1)

    if (membership.length === 0) {
      throw new Error('User is not a member of this organization')
    }

    const whereConditions: SQL<unknown>[] = [
      eq(requestTable.receiverOrganizationId, organizationId),
    ]

    this.appendLifecycleStatusFilter(whereConditions, lifecycleStatus)
    this.appendClosedReasonFilter(whereConditions, closedReason)
    this.appendSearchFilter(whereConditions, search)
    this.appendDateFilters(whereConditions, fromDate, toDate)
    this.appendAssignedToFilter(whereConditions, assignedTo)
    this.appendPriorityFilter(whereConditions, priority)

    const orderBy = sortOrder === 'asc' ? asc(requestTable.createdAt) : desc(requestTable.createdAt)
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(requestTable)
      .leftJoin(user, eq(requestTable.requesterEmail, user.email))
      .where(and(...whereConditions))

    const total = totalCountResult[0]?.count || 0
    const offset = (page - 1) * limit
    const assignedUser = aliasedTable(user, 'assigned_user')
    const assignedMember = aliasedTable(member, 'assigned_member')

    const rawRequests = await db
      .select({
        id: requestTable.id,
        reqNumber: requestTable.reqNumber,
        lifecycleStatus: requestTable.lifecycleStatus,
        closedReason: requestTable.closedReason,
        categories: requestTable.categories,
        services: requestTable.services,
        conversationId: requestTable.conversationId,
        comments: requestTable.comments,
        fromDate: requestTable.fromDate,
        toDate: requestTable.toDate,
        createdAt: requestTable.createdAt,
        updatedAt: requestTable.updatedAt,
        requesterName: requestTable.requesterName,
        requesterEmail: requestTable.requesterEmail,
        assignedToId: requestTable.assignedToId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        assignedUserId: assignedUser.id,
        assignedUserName: assignedUser.name,
        assignedUserEmail: assignedUser.email,
        assignedUserImage: assignedUser.image,
        assignedUserRole: assignedMember.role,
      })
      .from(requestTable)
      .leftJoin(user, eq(requestTable.requesterEmail, user.email))
      .leftJoin(assignedUser, eq(requestTable.assignedToId, assignedUser.id))
      .leftJoin(
        assignedMember,
        and(
          eq(assignedMember.userId, assignedUser.id),
          eq(assignedMember.organizationId, organizationId)
        )
      )
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const requests = rawRequests.map((request) => ({
      id: request.id,
      reqNumber: request.reqNumber,
      lifecycleStatus: request.lifecycleStatus,
      closedReason: request.closedReason,
      categories: request.categories,
      services: request.services,
      conversationId: request.conversationId,
      comments: request.comments,
      fromDate: request.fromDate,
      toDate: request.toDate,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      priority: calculateRequestPriority(request.fromDate, request.lifecycleStatus),
      requester: {
        id: request.userId,
        name: request.userName || request.requesterName,
        email: request.userEmail || request.requesterEmail,
        image: request.userImage,
      },
      assignedTo: request.assignedUserId
        ? {
            id: request.assignedUserId,
            name: request.assignedUserName,
            email: request.assignedUserEmail,
            role: request.assignedUserRole,
            image: request.assignedUserImage,
          }
        : null,
    }))

    return {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getOrganizationMembers(organizationId: string): Promise<unknown[]> {
    const roleOrder = sql`CASE WHEN ${member.role} = 'owner' THEN 0 WHEN ${member.role} = 'admin' THEN 1 WHEN ${member.role} = 'member' THEN 2 ELSE 3 END`

    return await db
      .select({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
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
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(roleOrder))
      .limit(10)
  }

  async getRequestsAggregation(
    organizationId: string
  ): Promise<RequestOrganizationRequestsAggregationResult> {
    const requests = await db
      .select({
        categories: requestTable.categories,
        services: requestTable.services,
      })
      .from(requestTable)
      .where(eq(requestTable.receiverOrganizationId, organizationId))

    const serviceCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}

    requests.forEach((requestRow) => {
      if (requestRow.services && Array.isArray(requestRow.services)) {
        requestRow.services.forEach((serviceId: string) => {
          serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1
        })
      }

      if (requestRow.categories && Array.isArray(requestRow.categories)) {
        requestRow.categories.forEach((categoryId: string) => {
          categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1
        })
      }
    })

    const totalRequests = requests.length
    const serviceIds = Object.keys(serviceCounts)
    const servicesData =
      serviceIds.length > 0
        ? await db.select().from(service).where(inArray(service.id, serviceIds))
        : []

    const categoryIds = Object.keys(categoryCounts)
    const categoriesData =
      categoryIds.length > 0
        ? await db.select().from(category).where(inArray(category.id, categoryIds))
        : []

    const servicesAggregation = servicesData
      .map((serviceRow) => ({
        id: serviceRow.id,
        name: serviceRow.name,
        slug: serviceRow.slug,
        type: serviceRow.type,
        count: serviceCounts[serviceRow.id] || 0,
        percentage:
          totalRequests > 0 ? Math.round((serviceCounts[serviceRow.id] / totalRequests) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const cargoTypesAggregation = categoriesData
      .map((categoryRow) => ({
        id: categoryRow.id,
        name: categoryRow.name,
        slug: categoryRow.slug,
        count: categoryCounts[categoryRow.id] || 0,
        percentage:
          totalRequests > 0
            ? Math.round((categoryCounts[categoryRow.id] / totalRequests) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      services: servicesAggregation,
      cargoTypes: cargoTypesAggregation,
    }
  }

  private appendLifecycleStatusFilter(
    whereConditions: SQL<unknown>[],
    lifecycleStatus?: string
  ): void {
    if (!lifecycleStatus) {
      whereConditions.push(
        and(
          sql`${requestTable.lifecycleStatus} != 'closed'`,
          gte(requestTable.fromDate, new Date())
        )!
      )
      return
    }

    if (lifecycleStatus === 'all') return

    if (lifecycleStatus === 'empty') {
      whereConditions.push(sql`1 = 0`)
      return
    }

    const statuses = lifecycleStatus
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as ERequestLifecycleStatus[]

    if (statuses.length === 1) {
      whereConditions.push(eq(requestTable.lifecycleStatus, statuses[0]))
    } else if (statuses.length > 1) {
      whereConditions.push(inArray(requestTable.lifecycleStatus, statuses))
    }
  }

  private appendClosedReasonFilter(whereConditions: SQL<unknown>[], closedReason?: string): void {
    if (!closedReason || closedReason === 'all') return

    if (closedReason === 'empty') {
      whereConditions.push(sql`1 = 0`)
      return
    }

    const closedReasons = closedReason
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean) as ERequestClosedReason[]

    if (closedReasons.length === 1) {
      whereConditions.push(eq(requestTable.closedReason, closedReasons[0]))
      return
    }

    if (closedReasons.length > 1) {
      whereConditions.push(inArray(requestTable.closedReason, closedReasons))
    }
  }

  private appendSearchFilter(whereConditions: SQL<unknown>[], search?: string): void {
    if (!search?.trim()) return

    const searchTerm = search.trim().toLowerCase()
    const searchCondition = or(
      like(sql`lower(${requestTable.reqNumber})`, `%${searchTerm}%`),
      like(sql`lower(${requestTable.requesterName})`, `%${searchTerm}%`),
      like(sql`lower(${requestTable.requesterEmail})`, `%${searchTerm}%`)
    )
    whereConditions.push(searchCondition!)
  }

  private appendDateFilters(
    whereConditions: SQL<unknown>[],
    fromDate?: string,
    toDate?: string
  ): void {
    if (fromDate && toDate) {
      whereConditions.push(
        sql`(DATE(${requestTable.fromDate}) >= ${fromDate} AND DATE(${requestTable.toDate}) <= ${toDate})`
      )
    } else if (fromDate) {
      whereConditions.push(sql`DATE(${requestTable.fromDate}) >= ${fromDate}`)
    } else if (toDate) {
      whereConditions.push(sql`DATE(${requestTable.toDate}) <= ${toDate}`)
    }
  }

  private appendAssignedToFilter(
    whereConditions: SQL<unknown>[],
    assignedTo?: string | string[]
  ): void {
    if (!assignedTo) return

    if (typeof assignedTo === 'string') {
      const assignedToArray = assignedTo.split(',').filter(Boolean)
      if (assignedToArray.length === 1) {
        whereConditions.push(eq(requestTable.assignedToId, assignedToArray[0]))
      } else if (assignedToArray.length > 1) {
        whereConditions.push(inArray(requestTable.assignedToId, assignedToArray))
      }
      return
    }

    if (assignedTo.length === 1) {
      whereConditions.push(eq(requestTable.assignedToId, assignedTo[0]))
    } else if (assignedTo.length > 1) {
      whereConditions.push(inArray(requestTable.assignedToId, assignedTo))
    }
  }

  private appendPriorityFilter(whereConditions: SQL<unknown>[], priority?: string): void {
    const priorityArray = priority?.split(',').filter(Boolean) ?? []
    if (!priorityArray.length) return

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const priorityConditions = priorityArray
      .map((priorityValue) => {
        if (priorityValue === 'high') {
          const highMaxDate = new Date(now)
          highMaxDate.setDate(highMaxDate.getDate() + PRIORITY_THRESHOLDS.HIGH)
          return and(gte(requestTable.fromDate, now), lte(requestTable.fromDate, highMaxDate))
        }
        if (priorityValue === 'medium') {
          const mediumMinDate = new Date(now)
          mediumMinDate.setDate(mediumMinDate.getDate() + PRIORITY_THRESHOLDS.HIGH + 1)
          const mediumMaxDate = new Date(now)
          mediumMaxDate.setDate(mediumMaxDate.getDate() + PRIORITY_THRESHOLDS.MEDIUM)
          return and(
            gte(requestTable.fromDate, mediumMinDate),
            lte(requestTable.fromDate, mediumMaxDate)
          )
        }
        if (priorityValue === 'low') {
          const lowMinDate = new Date(now)
          lowMinDate.setDate(lowMinDate.getDate() + PRIORITY_THRESHOLDS.MEDIUM + 1)
          return gte(requestTable.fromDate, lowMinDate)
        }
      })
      .filter((condition): condition is SQL<unknown> => Boolean(condition))

    if (priorityConditions.length > 0) {
      whereConditions.push(or(...priorityConditions)!)
    }
  }
}
