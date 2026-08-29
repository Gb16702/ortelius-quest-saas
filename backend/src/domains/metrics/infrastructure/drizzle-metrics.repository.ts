import { and, desc, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import { user } from '../../../infrastructure/database/db/schemas/auth-schema'
import {
  organizationMetrics,
  organizationMetricsDaily,
  organizationPublicPageVisitor,
} from '../../../infrastructure/database/db/schemas/metrics-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import type {
  MetricsRecentRequestsQuery,
  MetricsRepository,
  MetricsUserDirectory,
} from '../application/ports'
import type {
  MemberDailyMetrics,
  MemberMetrics,
  MetricsUser,
  OrganizationDailyMetrics,
  OrganizationMetrics,
  RecentOrganizationRequest,
} from '../domain/metrics-models'
import {
  completeOrganizationDailyMetrics,
  getMetricsStartDate,
  startOfToday,
} from '../domain/metrics-time-series'
import { memberMetricsRepository } from './drizzle-member-metrics.repository'

export class DrizzleMetricsRepository
  implements MetricsRepository, MetricsUserDirectory, MetricsRecentRequestsQuery
{
  async incrementRequestMetric(organizationId: string): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingMetrics = await db
      .select()
      .from(organizationMetrics)
      .where(eq(organizationMetrics.organizationId, organizationId))
      .limit(1)

    if (existingMetrics.length === 0) {
      await db.insert(organizationMetrics).values({
        id: nanoid(),
        organizationId,
        totalRequestsReceived: 1,
      })
    } else {
      await db
        .update(organizationMetrics)
        .set({
          totalRequestsReceived: sql`${organizationMetrics.totalRequestsReceived} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organizationMetrics.organizationId, organizationId))
    }

    const existingDaily = await db
      .select()
      .from(organizationMetricsDaily)
      .where(
        and(
          eq(organizationMetricsDaily.organizationId, organizationId),
          eq(organizationMetricsDaily.date, today)
        )
      )
      .limit(1)

    if (existingDaily.length === 0) {
      await db.insert(organizationMetricsDaily).values({
        id: nanoid(),
        organizationId,
        date: today,
        requestsReceived: 1,
        newVisitors: 0,
      })
    } else {
      await db
        .update(organizationMetricsDaily)
        .set({
          requestsReceived: sql`${organizationMetricsDaily.requestsReceived} + 1`,
        })
        .where(
          and(
            eq(organizationMetricsDaily.organizationId, organizationId),
            eq(organizationMetricsDaily.date, today)
          )
        )
    }
  }

  async incrementNewVisitorMetric(organizationId: string, visitorHash: string): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    const insertedVisitors = await db
      .insert(organizationPublicPageVisitor)
      .values({
        id: nanoid(),
        organizationId,
        visitorHash,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoNothing({
        target: [
          organizationPublicPageVisitor.organizationId,
          organizationPublicPageVisitor.visitorHash,
        ],
      })
      .returning({ id: organizationPublicPageVisitor.id })

    if (insertedVisitors.length === 0) {
      await db
        .update(organizationPublicPageVisitor)
        .set({ lastSeenAt: now })
        .where(
          and(
            eq(organizationPublicPageVisitor.organizationId, organizationId),
            eq(organizationPublicPageVisitor.visitorHash, visitorHash)
          )
        )
      return
    }

    const existingMetrics = await db
      .select()
      .from(organizationMetrics)
      .where(eq(organizationMetrics.organizationId, organizationId))
      .limit(1)

    if (existingMetrics.length === 0) {
      await db.insert(organizationMetrics).values({
        id: nanoid(),
        organizationId,
        totalRequestsReceived: 0,
        totalNewVisitors: 1,
      })
    } else {
      await db
        .update(organizationMetrics)
        .set({
          totalNewVisitors: sql`${organizationMetrics.totalNewVisitors} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organizationMetrics.organizationId, organizationId))
    }

    const existingDaily = await db
      .select()
      .from(organizationMetricsDaily)
      .where(
        and(
          eq(organizationMetricsDaily.organizationId, organizationId),
          eq(organizationMetricsDaily.date, today)
        )
      )
      .limit(1)

    if (existingDaily.length === 0) {
      await db.insert(organizationMetricsDaily).values({
        id: nanoid(),
        organizationId,
        date: today,
        requestsReceived: 0,
        newVisitors: 1,
      })
    } else {
      await db
        .update(organizationMetricsDaily)
        .set({
          newVisitors: sql`${organizationMetricsDaily.newVisitors} + 1`,
        })
        .where(
          and(
            eq(organizationMetricsDaily.organizationId, organizationId),
            eq(organizationMetricsDaily.date, today)
          )
        )
    }
  }

  async getOrganizationMetrics(organizationId: string): Promise<OrganizationMetrics | null> {
    const metrics = await db
      .select()
      .from(organizationMetrics)
      .where(eq(organizationMetrics.organizationId, organizationId))
      .limit(1)

    return metrics[0] || null
  }

  async getOrganizationDailyMetrics(
    organizationId: string,
    days = 30
  ): Promise<OrganizationDailyMetrics[]> {
    const endDate = startOfToday()
    const startDate = getMetricsStartDate(endDate, days)

    const existingMetrics = await db
      .select()
      .from(organizationMetricsDaily)
      .where(
        and(
          eq(organizationMetricsDaily.organizationId, organizationId),
          sql`${organizationMetricsDaily.date} >= ${startDate}`
        )
      )
      .orderBy(organizationMetricsDaily.date)

    return completeOrganizationDailyMetrics(
      organizationId,
      existingMetrics,
      startDate,
      endDate,
      days
    )
  }

  private aggregateByWeek(
    organizationId: string,
    metrics: OrganizationDailyMetrics[],
    startDate: Date,
    endDate: Date
  ): OrganizationDailyMetrics[] {
    const weeks: Map<string, OrganizationDailyMetrics[]> = new Map()

    const alignedStart = new Date(startDate)
    alignedStart.setDate(startDate.getDate() - startDate.getDay())
    alignedStart.setHours(0, 0, 0, 0)

    for (let d = new Date(alignedStart); d <= endDate; d.setDate(d.getDate() + 7)) {
      const weekStart = new Date(d)
      weekStart.setHours(0, 0, 0, 0)
      const weekKey = weekStart.toISOString().split('T')[0]
      weeks.set(weekKey, [])
    }

    for (const metric of metrics) {
      const metricDate = new Date(metric.date)
      const weekStart = new Date(metricDate)
      weekStart.setDate(metricDate.getDate() - metricDate.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekKey = weekStart.toISOString().split('T')[0]
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, [])
      }
      weeks.get(weekKey)!.push(metric)
    }

    return Array.from(weeks.entries()).map(([weekKey, weekMetrics]) => {
      const weekDate = new Date(weekKey)

      if (weekMetrics.length === 0) {
        return {
          id: `empty-week-${organizationId}-${weekDate.getTime()}`,
          organizationId,
          date: weekDate,
          requestsReceived: 0,
          newVisitors: 0,
          quotesGenerated: 0,
          invoicesCreated: 0,
          revenue: '0',
          createdAt: weekDate,
          updatedAt: weekDate,
        }
      }

      return {
        id: `week-${organizationId}-${weekDate.getTime()}`,
        organizationId,
        date: weekDate,
        requestsReceived: weekMetrics.reduce((sum, m) => sum + m.requestsReceived, 0),
        newVisitors: weekMetrics.reduce((sum, m) => sum + m.newVisitors, 0),
        quotesGenerated: weekMetrics.reduce((sum, m) => sum + m.quotesGenerated, 0),
        invoicesCreated: weekMetrics.reduce((sum, m) => sum + m.invoicesCreated, 0),
        revenue: weekMetrics
          .reduce((sum, m) => sum + Number.parseFloat(m.revenue || '0'), 0)
          .toString(),
        createdAt: weekDate,
        updatedAt: weekDate,
      }
    })
  }

  private aggregateByMonth(
    organizationId: string,
    metrics: OrganizationDailyMetrics[],
    startDate: Date,
    endDate: Date
  ): OrganizationDailyMetrics[] {
    const months: Map<string, OrganizationDailyMetrics[]> = new Map()

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      monthStart.setHours(0, 0, 0, 0)
      const monthKey = monthStart.toISOString().split('T')[0]
      months.set(monthKey, [])
    }

    for (const metric of metrics) {
      const metricDate = new Date(metric.date)
      const monthStart = new Date(metricDate.getFullYear(), metricDate.getMonth(), 1)
      monthStart.setHours(0, 0, 0, 0)

      const monthKey = monthStart.toISOString().split('T')[0]
      if (months.has(monthKey)) {
        months.get(monthKey)!.push(metric)
      }
    }

    return Array.from(months.entries()).map(([monthKey, monthMetrics]) => {
      const monthDate = new Date(monthKey)

      if (monthMetrics.length === 0) {
        return {
          id: `empty-month-${organizationId}-${monthDate.getTime()}`,
          organizationId,
          date: monthDate,
          requestsReceived: 0,
          newVisitors: 0,
          quotesGenerated: 0,
          invoicesCreated: 0,
          revenue: '0',
          createdAt: monthDate,
          updatedAt: monthDate,
        }
      }

      return {
        id: `month-${organizationId}-${monthDate.getTime()}`,
        organizationId,
        date: monthDate,
        requestsReceived: monthMetrics.reduce((sum, m) => sum + m.requestsReceived, 0),
        newVisitors: monthMetrics.reduce((sum, m) => sum + m.newVisitors, 0),
        quotesGenerated: monthMetrics.reduce((sum, m) => sum + m.quotesGenerated, 0),
        invoicesCreated: monthMetrics.reduce((sum, m) => sum + m.invoicesCreated, 0),
        revenue: monthMetrics
          .reduce((sum, m) => sum + Number.parseFloat(m.revenue || '0'), 0)
          .toString(),
        createdAt: monthDate,
        updatedAt: monthDate,
      }
    })
  }

  async incrementQuoteMetric(organizationId: string, revenue?: number): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const revenueStr = revenue?.toString() || '0'

    const existingMetrics = await db
      .select()
      .from(organizationMetrics)
      .where(eq(organizationMetrics.organizationId, organizationId))
      .limit(1)

    if (existingMetrics.length === 0) {
      await db.insert(organizationMetrics).values({
        id: nanoid(),
        organizationId,
        totalRequestsReceived: 0,
        totalQuotesGenerated: 1,
        totalRevenue: revenueStr,
      })
    } else {
      await db
        .update(organizationMetrics)
        .set({
          totalQuotesGenerated: sql`${organizationMetrics.totalQuotesGenerated} + 1`,
          totalRevenue: sql`${organizationMetrics.totalRevenue} + ${revenueStr}`,
          updatedAt: new Date(),
        })
        .where(eq(organizationMetrics.organizationId, organizationId))
    }

    await this.updateDailyMetric(organizationId, today, {
      quotesGenerated: 1,
      revenue: revenueStr,
    })
  }

  async incrementInvoiceMetric(organizationId: string, revenue?: number): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const revenueStr = revenue?.toString() || '0'

    const existingMetrics = await db
      .select()
      .from(organizationMetrics)
      .where(eq(organizationMetrics.organizationId, organizationId))
      .limit(1)

    if (existingMetrics.length === 0) {
      await db.insert(organizationMetrics).values({
        id: nanoid(),
        organizationId,
        totalRequestsReceived: 0,
        totalInvoicesCreated: 1,
        totalRevenue: revenueStr,
      })
    } else {
      await db
        .update(organizationMetrics)
        .set({
          totalInvoicesCreated: sql`${organizationMetrics.totalInvoicesCreated} + 1`,
          totalRevenue: sql`${organizationMetrics.totalRevenue} + ${revenueStr}`,
          updatedAt: new Date(),
        })
        .where(eq(organizationMetrics.organizationId, organizationId))
    }

    await this.updateDailyMetric(organizationId, today, {
      invoicesCreated: 1,
      revenue: revenueStr,
    })
  }

  private async updateDailyMetric(
    organizationId: string,
    date: Date,
    updates: {
      requestsReceived?: number
      newVisitors?: number
      quotesGenerated?: number
      invoicesCreated?: number
      revenue?: string
    }
  ): Promise<void> {
    const existingDaily = await db
      .select()
      .from(organizationMetricsDaily)
      .where(
        and(
          eq(organizationMetricsDaily.organizationId, organizationId),
          eq(organizationMetricsDaily.date, date)
        )
      )
      .limit(1)

    if (existingDaily.length === 0) {
      await db.insert(organizationMetricsDaily).values({
        id: nanoid(),
        organizationId,
        date,
        requestsReceived: updates.requestsReceived || 0,
        newVisitors: updates.newVisitors || 0,
        quotesGenerated: updates.quotesGenerated || 0,
        invoicesCreated: updates.invoicesCreated || 0,
        revenue: updates.revenue || '0',
      })
    } else {
      const setClause: Record<string, unknown> = {}

      if (updates.requestsReceived) {
        setClause.requestsReceived = sql`${organizationMetricsDaily.requestsReceived} + ${updates.requestsReceived}`
      }
      if (updates.newVisitors) {
        setClause.newVisitors = sql`${organizationMetricsDaily.newVisitors} + ${updates.newVisitors}`
      }
      if (updates.quotesGenerated) {
        setClause.quotesGenerated = sql`${organizationMetricsDaily.quotesGenerated} + ${updates.quotesGenerated}`
      }
      if (updates.invoicesCreated) {
        setClause.invoicesCreated = sql`${organizationMetricsDaily.invoicesCreated} + ${updates.invoicesCreated}`
      }
      if (updates.revenue) {
        setClause.revenue = sql`${organizationMetricsDaily.revenue} + ${updates.revenue}`
      }

      if (Object.keys(setClause).length > 0) {
        await db
          .update(organizationMetricsDaily)
          .set(setClause)
          .where(
            and(
              eq(organizationMetricsDaily.organizationId, organizationId),
              eq(organizationMetricsDaily.date, date)
            )
          )
      }
    }
  }

  async incrementMemberRequest(userId: string, organizationId: string): Promise<void> {
    return memberMetricsRepository.incrementMemberRequest(userId, organizationId)
  }

  async incrementMemberQuote(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    return memberMetricsRepository.incrementMemberQuote(userId, organizationId, revenue)
  }

  async incrementMemberInvoice(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    return memberMetricsRepository.incrementMemberInvoice(userId, organizationId, revenue)
  }

  async incrementMemberConversation(userId: string, organizationId: string): Promise<void> {
    return memberMetricsRepository.incrementMemberConversation(userId, organizationId)
  }

  async incrementMemberMessage(userId: string, organizationId: string): Promise<void> {
    return memberMetricsRepository.incrementMemberMessage(userId, organizationId)
  }

  async getMemberMetrics(userId: string, organizationId: string): Promise<MemberMetrics | null> {
    return memberMetricsRepository.getMemberMetrics(userId, organizationId)
  }

  async getMemberDailyMetrics(
    userId: string,
    organizationId: string,
    days = 30
  ): Promise<MemberDailyMetrics[]> {
    return memberMetricsRepository.getMemberDailyMetrics(userId, organizationId, days)
  }

  async getAllMembersMetrics(organizationId: string): Promise<MemberMetrics[]> {
    return memberMetricsRepository.getAllMembersMetrics(organizationId)
  }

  async getUserById(userId: string): Promise<MetricsUser | null> {
    const [userRecord] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return userRecord ?? null
  }

  async getRecentOrganizationRequests(
    organizationId: string,
    limit: number
  ): Promise<RecentOrganizationRequest[]> {
    const requests = await db
      .select({
        id: request.id,
        reqNumber: request.reqNumber,
        lifecycleStatus: request.lifecycleStatus,
        closedReason: request.closedReason,
        requesterId: request.requesterId,
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        createdAt: request.createdAt,
      })
      .from(request)
      .where(eq(request.receiverOrganizationId, organizationId))
      .orderBy(desc(request.createdAt))
      .limit(limit)

    return await Promise.all(
      requests.map(async (req) => {
        let requesterImage: string | null = null

        if (req.requesterId) {
          const [userRecord] = await db
            .select({ image: user.image })
            .from(user)
            .where(eq(user.id, req.requesterId))
            .limit(1)

          if (userRecord) {
            requesterImage = userRecord.image
          }
        }

        return {
          id: req.id,
          reqNumber: req.reqNumber,
          lifecycleStatus: req.lifecycleStatus,
          closedReason: req.closedReason,
          requester: {
            id: req.requesterId,
            name: req.requesterName,
            email: req.requesterEmail,
            image: requesterImage,
          },
          createdAt: req.createdAt.toISOString(),
        }
      })
    )
  }
}

export const metricsRepository = new DrizzleMetricsRepository()
