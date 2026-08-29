import type {
  MemberDailyMetrics,
  MemberMetrics,
  MemberMetricsSummary,
  OrganizationDailyMetrics,
  OrganizationMetrics,
  OrganizationMetricsSummary,
} from './metrics-models'

export function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function getMetricsStartDate(endDate: Date, days: number): Date {
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days + 1)
  return startDate
}

export function completeOrganizationDailyMetrics(
  organizationId: string,
  metrics: OrganizationDailyMetrics[],
  startDate: Date,
  endDate: Date,
  days: number
): OrganizationDailyMetrics[] {
  if (days >= 600) {
    return aggregateOrganizationMetricsByMonth(organizationId, metrics, startDate, endDate)
  }

  if (days >= 120) {
    return aggregateOrganizationMetricsByWeek(organizationId, metrics, startDate, endDate)
  }

  const metricsMap = new Map(metrics.map((metric) => [toDateKey(metric.date), metric]))

  return dateRange(startDate, days).map((date) => {
    const existingMetric = metricsMap.get(toDateKey(date))
    if (existingMetric) return existingMetric

    return {
      id: `empty-${organizationId}-${date.getTime()}`,
      organizationId,
      date,
      requestsReceived: 0,
      newVisitors: 0,
      quotesGenerated: 0,
      invoicesCreated: 0,
      revenue: '0',
      createdAt: date,
      updatedAt: date,
    }
  })
}

export function completeMemberDailyMetrics(
  userId: string,
  organizationId: string,
  metrics: MemberDailyMetrics[],
  startDate: Date,
  endDate: Date,
  days: number
): MemberDailyMetrics[] {
  if (days >= 600) {
    return aggregateMemberMetricsByMonth(userId, organizationId, metrics, startDate, endDate)
  }

  if (days >= 120) {
    return aggregateMemberMetricsByWeek(userId, organizationId, metrics, startDate, endDate)
  }

  const metricsMap = new Map(metrics.map((metric) => [toDateKey(metric.date), metric]))

  return dateRange(startDate, days).map((date) => {
    const existingMetric = metricsMap.get(toDateKey(date))
    if (existingMetric) return existingMetric

    return {
      id: `empty-${userId}-${organizationId}-${date.getTime()}`,
      userId,
      organizationId,
      date,
      requestsHandled: 0,
      quotesCreated: 0,
      invoicesCreated: 0,
      revenue: '0',
      messagesCount: 0,
      createdAt: date,
      updatedAt: date,
    }
  })
}

export function summarizeOrganizationMetrics(
  metrics: OrganizationMetrics | null,
  dailyMetrics: OrganizationDailyMetrics[],
  days: number
): OrganizationMetricsSummary {
  const totalRequests = dailyMetrics.reduce((sum, day) => sum + day.requestsReceived, 0)
  const totalNewVisitors = dailyMetrics.reduce((sum, day) => sum + day.newVisitors, 0)
  const totalRevenue = dailyMetrics.reduce(
    (sum, day) => sum + Number.parseFloat(day.revenue || '0'),
    0
  )

  return {
    totalRequests: metrics?.totalRequestsReceived || 0,
    totalNewVisitors: metrics?.totalNewVisitors || 0,
    totalQuotes: metrics?.totalQuotesGenerated || 0,
    totalInvoices: metrics?.totalInvoicesCreated || 0,
    totalRevenue: Number.parseFloat(metrics?.totalRevenue || '0'),
    averageDailyRequests: dailyMetrics.length > 0 ? totalRequests / dailyMetrics.length : 0,
    averageDailyNewVisitors: dailyMetrics.length > 0 ? totalNewVisitors / dailyMetrics.length : 0,
    averageDailyRevenue: dailyMetrics.length > 0 ? totalRevenue / dailyMetrics.length : 0,
    periodDays: days,
  }
}

export function summarizeMemberMetrics(
  metrics: MemberMetrics | null,
  dailyMetrics: MemberDailyMetrics[],
  days: number
): MemberMetricsSummary {
  const totalRequests = dailyMetrics.reduce((sum, day) => sum + day.requestsHandled, 0)
  const totalRevenue = dailyMetrics.reduce(
    (sum, day) => sum + Number.parseFloat(day.revenue || '0'),
    0
  )

  return {
    requestsHandled: metrics?.requestsHandled || 0,
    quotesCreated: metrics?.quotesCreated || 0,
    invoicesCreated: metrics?.invoicesCreated || 0,
    totalRevenue: Number.parseFloat(metrics?.totalRevenue || '0'),
    conversationsCount: metrics?.conversationsCount || 0,
    messagesCount: metrics?.messagesCount || 0,
    averageDailyRequests: dailyMetrics.length > 0 ? totalRequests / dailyMetrics.length : 0,
    averageDailyRevenue: dailyMetrics.length > 0 ? totalRevenue / dailyMetrics.length : 0,
    periodDays: days,
  }
}

function aggregateOrganizationMetricsByWeek(
  organizationId: string,
  metrics: OrganizationDailyMetrics[],
  startDate: Date,
  endDate: Date
): OrganizationDailyMetrics[] {
  const weeks = groupByWeek(metrics, startDate, endDate)

  return Array.from(weeks.entries()).map(([weekKey, weekMetrics]) => {
    const weekDate = new Date(weekKey)
    if (weekMetrics.length === 0) {
      return emptyOrganizationMetric(`empty-week-${organizationId}`, organizationId, weekDate)
    }

    return {
      id: `week-${organizationId}-${weekDate.getTime()}`,
      organizationId,
      date: weekDate,
      requestsReceived: weekMetrics.reduce((sum, metric) => sum + metric.requestsReceived, 0),
      newVisitors: weekMetrics.reduce((sum, metric) => sum + metric.newVisitors, 0),
      quotesGenerated: weekMetrics.reduce((sum, metric) => sum + metric.quotesGenerated, 0),
      invoicesCreated: weekMetrics.reduce((sum, metric) => sum + metric.invoicesCreated, 0),
      revenue: sumRevenue(weekMetrics).toString(),
      createdAt: weekDate,
      updatedAt: weekDate,
    }
  })
}

function aggregateOrganizationMetricsByMonth(
  organizationId: string,
  metrics: OrganizationDailyMetrics[],
  startDate: Date,
  endDate: Date
): OrganizationDailyMetrics[] {
  const months = groupByMonth(metrics, startDate, endDate)

  return Array.from(months.entries()).map(([monthKey, monthMetrics]) => {
    const monthDate = new Date(monthKey)
    if (monthMetrics.length === 0) {
      return emptyOrganizationMetric(`empty-month-${organizationId}`, organizationId, monthDate)
    }

    return {
      id: `month-${organizationId}-${monthDate.getTime()}`,
      organizationId,
      date: monthDate,
      requestsReceived: monthMetrics.reduce((sum, metric) => sum + metric.requestsReceived, 0),
      newVisitors: monthMetrics.reduce((sum, metric) => sum + metric.newVisitors, 0),
      quotesGenerated: monthMetrics.reduce((sum, metric) => sum + metric.quotesGenerated, 0),
      invoicesCreated: monthMetrics.reduce((sum, metric) => sum + metric.invoicesCreated, 0),
      revenue: sumRevenue(monthMetrics).toString(),
      createdAt: monthDate,
      updatedAt: monthDate,
    }
  })
}

function aggregateMemberMetricsByWeek(
  userId: string,
  organizationId: string,
  metrics: MemberDailyMetrics[],
  startDate: Date,
  endDate: Date
): MemberDailyMetrics[] {
  const weeks = groupByWeek(metrics, startDate, endDate)

  return Array.from(weeks.entries()).map(([weekKey, weekMetrics]) => {
    const weekDate = new Date(weekKey)
    if (weekMetrics.length === 0) {
      return emptyMemberMetric(
        `empty-week-${userId}-${organizationId}`,
        userId,
        organizationId,
        weekDate
      )
    }

    return {
      id: `week-${userId}-${organizationId}-${weekDate.getTime()}`,
      userId,
      organizationId,
      date: weekDate,
      requestsHandled: weekMetrics.reduce((sum, metric) => sum + metric.requestsHandled, 0),
      quotesCreated: weekMetrics.reduce((sum, metric) => sum + metric.quotesCreated, 0),
      invoicesCreated: weekMetrics.reduce((sum, metric) => sum + metric.invoicesCreated, 0),
      revenue: sumRevenue(weekMetrics).toString(),
      messagesCount: weekMetrics.reduce((sum, metric) => sum + metric.messagesCount, 0),
      createdAt: weekDate,
      updatedAt: weekDate,
    }
  })
}

function aggregateMemberMetricsByMonth(
  userId: string,
  organizationId: string,
  metrics: MemberDailyMetrics[],
  startDate: Date,
  endDate: Date
): MemberDailyMetrics[] {
  const months = groupByMonth(metrics, startDate, endDate)

  return Array.from(months.entries()).map(([monthKey, monthMetrics]) => {
    const monthDate = new Date(monthKey)
    if (monthMetrics.length === 0) {
      return emptyMemberMetric(
        `empty-month-${userId}-${organizationId}`,
        userId,
        organizationId,
        monthDate
      )
    }

    return {
      id: `month-${userId}-${organizationId}-${monthDate.getTime()}`,
      userId,
      organizationId,
      date: monthDate,
      requestsHandled: monthMetrics.reduce((sum, metric) => sum + metric.requestsHandled, 0),
      quotesCreated: monthMetrics.reduce((sum, metric) => sum + metric.quotesCreated, 0),
      invoicesCreated: monthMetrics.reduce((sum, metric) => sum + metric.invoicesCreated, 0),
      revenue: sumRevenue(monthMetrics).toString(),
      messagesCount: monthMetrics.reduce((sum, metric) => sum + metric.messagesCount, 0),
      createdAt: monthDate,
      updatedAt: monthDate,
    }
  })
}

function groupByWeek<T extends { date: Date }>(
  metrics: T[],
  startDate: Date,
  endDate: Date
): Map<string, T[]> {
  const weeks = new Map<string, T[]>()
  const alignedStart = new Date(startDate)
  alignedStart.setDate(startDate.getDate() - startDate.getDay())
  alignedStart.setHours(0, 0, 0, 0)

  for (const date = new Date(alignedStart); date <= endDate; date.setDate(date.getDate() + 7)) {
    const weekStart = new Date(date)
    weekStart.setHours(0, 0, 0, 0)
    weeks.set(toDateKey(weekStart), [])
  }

  for (const metric of metrics) {
    const metricDate = new Date(metric.date)
    const weekStart = new Date(metricDate)
    weekStart.setDate(metricDate.getDate() - metricDate.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = toDateKey(weekStart)
    if (!weeks.has(weekKey)) weeks.set(weekKey, [])
    weeks.get(weekKey)!.push(metric)
  }

  return weeks
}

function groupByMonth<T extends { date: Date }>(
  metrics: T[],
  startDate: Date,
  endDate: Date
): Map<string, T[]> {
  const months = new Map<string, T[]>()

  for (const date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    months.set(toDateKey(monthStart), [])
  }

  for (const metric of metrics) {
    const metricDate = new Date(metric.date)
    const monthStart = new Date(metricDate.getFullYear(), metricDate.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const monthKey = toDateKey(monthStart)
    if (months.has(monthKey)) months.get(monthKey)!.push(metric)
  }

  return months
}

function dateRange(startDate: Date, days: number): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }
  return dates
}

function emptyOrganizationMetric(
  idPrefix: string,
  organizationId: string,
  date: Date
): OrganizationDailyMetrics {
  return {
    id: `${idPrefix}-${date.getTime()}`,
    organizationId,
    date,
    requestsReceived: 0,
    newVisitors: 0,
    quotesGenerated: 0,
    invoicesCreated: 0,
    revenue: '0',
    createdAt: date,
    updatedAt: date,
  }
}

function emptyMemberMetric(
  idPrefix: string,
  userId: string,
  organizationId: string,
  date: Date
): MemberDailyMetrics {
  return {
    id: `${idPrefix}-${date.getTime()}`,
    userId,
    organizationId,
    date,
    requestsHandled: 0,
    quotesCreated: 0,
    invoicesCreated: 0,
    revenue: '0',
    messagesCount: 0,
    createdAt: date,
    updatedAt: date,
  }
}

function sumRevenue(metrics: { revenue: string }[]): number {
  return metrics.reduce((sum, metric) => sum + Number.parseFloat(metric.revenue || '0'), 0)
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}
