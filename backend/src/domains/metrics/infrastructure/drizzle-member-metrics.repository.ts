import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import {
  memberMetrics,
  memberMetricsDaily,
} from '../../../infrastructure/database/db/schemas/metrics-schema'
import type { MetricsRepository } from '../application/ports'
import type { MemberDailyMetrics, MemberMetrics } from '../domain/metrics-models'
import {
  completeMemberDailyMetrics,
  getMetricsStartDate,
  startOfToday,
} from '../domain/metrics-time-series'

export class DrizzleMemberMetricsRepository
  implements
    Pick<
      MetricsRepository,
      | 'incrementMemberRequest'
      | 'incrementMemberQuote'
      | 'incrementMemberInvoice'
      | 'incrementMemberConversation'
      | 'incrementMemberMessage'
      | 'getMemberMetrics'
      | 'getMemberDailyMetrics'
      | 'getAllMembersMetrics'
    >
{
  async incrementMemberRequest(userId: string, organizationId: string): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await db
      .select()
      .from(memberMetrics)
      .where(
        and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(memberMetrics).values({
        id: nanoid(),
        userId,
        organizationId,
        requestsHandled: 1,
        quotesCreated: 0,
        invoicesCreated: 0,
        totalRevenue: '0',
        conversationsCount: 0,
        messagesCount: 0,
      })
    } else {
      await db
        .update(memberMetrics)
        .set({
          requestsHandled: sql`${memberMetrics.requestsHandled} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
        )
    }

    await this.updateDailyMetric(userId, organizationId, today, {
      requestsHandled: 1,
    })
  }

  async incrementMemberQuote(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const revenueStr = revenue?.toString() || '0'

    const existing = await db
      .select()
      .from(memberMetrics)
      .where(
        and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(memberMetrics).values({
        id: nanoid(),
        userId,
        organizationId,
        requestsHandled: 0,
        quotesCreated: 1,
        invoicesCreated: 0,
        totalRevenue: revenueStr,
        conversationsCount: 0,
        messagesCount: 0,
      })
    } else {
      await db
        .update(memberMetrics)
        .set({
          quotesCreated: sql`${memberMetrics.quotesCreated} + 1`,
          totalRevenue: sql`${memberMetrics.totalRevenue} + ${revenueStr}`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
        )
    }

    await this.updateDailyMetric(userId, organizationId, today, {
      quotesCreated: 1,
      revenue: revenueStr,
    })
  }

  async incrementMemberInvoice(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const revenueStr = revenue?.toString() || '0'

    const existing = await db
      .select()
      .from(memberMetrics)
      .where(
        and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(memberMetrics).values({
        id: nanoid(),
        userId,
        organizationId,
        requestsHandled: 0,
        quotesCreated: 0,
        invoicesCreated: 1,
        totalRevenue: revenueStr,
        conversationsCount: 0,
        messagesCount: 0,
      })
    } else {
      await db
        .update(memberMetrics)
        .set({
          invoicesCreated: sql`${memberMetrics.invoicesCreated} + 1`,
          totalRevenue: sql`${memberMetrics.totalRevenue} + ${revenueStr}`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
        )
    }
    await this.updateDailyMetric(userId, organizationId, today, {
      invoicesCreated: 1,
      revenue: revenueStr,
    })
  }

  async incrementMemberConversation(userId: string, organizationId: string): Promise<void> {
    const existing = await db
      .select()
      .from(memberMetrics)
      .where(
        and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(memberMetrics).values({
        id: nanoid(),
        userId,
        organizationId,
        requestsHandled: 0,
        quotesCreated: 0,
        invoicesCreated: 0,
        totalRevenue: '0',
        conversationsCount: 1,
        messagesCount: 0,
      })
    } else {
      await db
        .update(memberMetrics)
        .set({
          conversationsCount: sql`${memberMetrics.conversationsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
        )
    }
  }

  async incrementMemberMessage(userId: string, organizationId: string): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await db
      .select()
      .from(memberMetrics)
      .where(
        and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(memberMetrics).values({
        id: nanoid(),
        userId,
        organizationId,
        requestsHandled: 0,
        quotesCreated: 0,
        invoicesCreated: 0,
        totalRevenue: '0',
        conversationsCount: 0,
        messagesCount: 1,
      })
    } else {
      await db
        .update(memberMetrics)
        .set({
          messagesCount: sql`${memberMetrics.messagesCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
        )
    }

    await this.updateDailyMetric(userId, organizationId, today, {
      messagesCount: 1,
    })
  }

  async getMemberMetrics(userId: string, organizationId: string): Promise<MemberMetrics | null> {
    const metrics = await db
      .select()
      .from(memberMetrics)
      .where(
        and(eq(memberMetrics.userId, userId), eq(memberMetrics.organizationId, organizationId))
      )
      .limit(1)

    return metrics[0] || null
  }

  async getMemberDailyMetrics(
    userId: string,
    organizationId: string,
    days = 30
  ): Promise<MemberDailyMetrics[]> {
    const endDate = startOfToday()
    const startDate = getMetricsStartDate(endDate, days)

    const existingMetrics = await db
      .select()
      .from(memberMetricsDaily)
      .where(
        and(
          eq(memberMetricsDaily.userId, userId),
          eq(memberMetricsDaily.organizationId, organizationId),
          sql`${memberMetricsDaily.date} >= ${startDate}`
        )
      )
      .orderBy(memberMetricsDaily.date)

    return completeMemberDailyMetrics(
      userId,
      organizationId,
      existingMetrics,
      startDate,
      endDate,
      days
    )
  }

  private aggregateByWeek(
    userId: string,
    organizationId: string,
    metrics: MemberDailyMetrics[],
    startDate: Date,
    endDate: Date
  ): MemberDailyMetrics[] {
    const weeks: Map<string, MemberDailyMetrics[]> = new Map()

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
          id: `empty-week-${userId}-${organizationId}-${weekDate.getTime()}`,
          userId,
          organizationId,
          date: weekDate,
          requestsHandled: 0,
          quotesCreated: 0,
          invoicesCreated: 0,
          revenue: '0',
          messagesCount: 0,
          createdAt: weekDate,
          updatedAt: weekDate,
        }
      }

      return {
        id: `week-${userId}-${organizationId}-${weekDate.getTime()}`,
        userId,
        organizationId,
        date: weekDate,
        requestsHandled: weekMetrics.reduce((sum, m) => sum + m.requestsHandled, 0),
        quotesCreated: weekMetrics.reduce((sum, m) => sum + m.quotesCreated, 0),
        invoicesCreated: weekMetrics.reduce((sum, m) => sum + m.invoicesCreated, 0),
        revenue: weekMetrics
          .reduce((sum, m) => sum + Number.parseFloat(m.revenue || '0'), 0)
          .toString(),
        messagesCount: weekMetrics.reduce((sum, m) => sum + m.messagesCount, 0),
        createdAt: weekDate,
        updatedAt: weekDate,
      }
    })
  }

  private aggregateByMonth(
    userId: string,
    organizationId: string,
    metrics: MemberDailyMetrics[],
    startDate: Date,
    endDate: Date
  ): MemberDailyMetrics[] {
    const months: Map<string, MemberDailyMetrics[]> = new Map()

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
          id: `empty-month-${userId}-${organizationId}-${monthDate.getTime()}`,
          userId,
          organizationId,
          date: monthDate,
          requestsHandled: 0,
          quotesCreated: 0,
          invoicesCreated: 0,
          revenue: '0',
          messagesCount: 0,
          createdAt: monthDate,
          updatedAt: monthDate,
        }
      }

      return {
        id: `month-${userId}-${organizationId}-${monthDate.getTime()}`,
        userId,
        organizationId,
        date: monthDate,
        requestsHandled: monthMetrics.reduce((sum, m) => sum + m.requestsHandled, 0),
        quotesCreated: monthMetrics.reduce((sum, m) => sum + m.quotesCreated, 0),
        invoicesCreated: monthMetrics.reduce((sum, m) => sum + m.invoicesCreated, 0),
        revenue: monthMetrics
          .reduce((sum, m) => sum + Number.parseFloat(m.revenue || '0'), 0)
          .toString(),
        messagesCount: monthMetrics.reduce((sum, m) => sum + m.messagesCount, 0),
        createdAt: monthDate,
        updatedAt: monthDate,
      }
    })
  }

  async getAllMembersMetrics(organizationId: string): Promise<MemberMetrics[]> {
    return await db
      .select()
      .from(memberMetrics)
      .where(eq(memberMetrics.organizationId, organizationId))
  }

  private async updateDailyMetric(
    userId: string,
    organizationId: string,
    date: Date,
    updates: {
      requestsHandled?: number
      quotesCreated?: number
      invoicesCreated?: number
      revenue?: string
      messagesCount?: number
    }
  ): Promise<void> {
    const existingDaily = await db
      .select()
      .from(memberMetricsDaily)
      .where(
        and(
          eq(memberMetricsDaily.userId, userId),
          eq(memberMetricsDaily.organizationId, organizationId),
          eq(memberMetricsDaily.date, date)
        )
      )
      .limit(1)

    if (existingDaily.length === 0) {
      await db.insert(memberMetricsDaily).values({
        id: nanoid(),
        userId,
        organizationId,
        date,
        requestsHandled: updates.requestsHandled || 0,
        quotesCreated: updates.quotesCreated || 0,
        invoicesCreated: updates.invoicesCreated || 0,
        revenue: updates.revenue || '0',
        messagesCount: updates.messagesCount || 0,
      })
    } else {
      const setClause: Record<string, unknown> = {}

      if (updates.requestsHandled) {
        setClause.requestsHandled = sql`${memberMetricsDaily.requestsHandled} + ${updates.requestsHandled}`
      }
      if (updates.quotesCreated) {
        setClause.quotesCreated = sql`${memberMetricsDaily.quotesCreated} + ${updates.quotesCreated}`
      }
      if (updates.invoicesCreated) {
        setClause.invoicesCreated = sql`${memberMetricsDaily.invoicesCreated} + ${updates.invoicesCreated}`
      }
      if (updates.revenue) {
        setClause.revenue = sql`${memberMetricsDaily.revenue} + ${updates.revenue}`
      }
      if (updates.messagesCount) {
        setClause.messagesCount = sql`${memberMetricsDaily.messagesCount} + ${updates.messagesCount}`
      }

      if (Object.keys(setClause).length > 0) {
        await db
          .update(memberMetricsDaily)
          .set(setClause)
          .where(
            and(
              eq(memberMetricsDaily.userId, userId),
              eq(memberMetricsDaily.organizationId, organizationId),
              eq(memberMetricsDaily.date, date)
            )
          )
      }
    }
  }
}

export const memberMetricsRepository = new DrizzleMemberMetricsRepository()
