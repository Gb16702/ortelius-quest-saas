import { format, isSameMonth, isSameYear, startOfMonth, startOfWeek } from "date-fns"
import type { TimePeriod } from "../model/dashboard"
import type {
    MemberDailyMetrics,
    OrganizationDailyMetrics,
} from "../model/schemas/dashboard.schema"

export type DashboardChartGranularity = "day" | "week" | "month"

export interface OrganizationMetricChartPoint extends OrganizationDailyMetrics {
    viewToRequestConversion: number
    tooltipLabel?: string
}

export interface MemberMetricChartPoint extends MemberDailyMetrics {
    tooltipLabel?: string
}

interface OrganizationMetricAccumulator {
    date: string
    firstDate: Date
    lastDate: Date
    requestsReceived: number
    newVisitors: number
    quotesGenerated: number
    invoicesCreated: number
    revenue: number
}

interface MemberMetricAccumulator {
    date: string
    firstDate: Date
    lastDate: Date
    requestsHandled: number
    quotesCreated: number
    invoicesCreated: number
    revenue: number
    messagesCount: number
}

export function getDashboardChartGranularity(period: TimePeriod): DashboardChartGranularity {
    if (period === 365) return "month"
    if (period === 90) return "week"
    return "day"
}

export function createOrganizationMetricChartData(
    dailyMetrics: ReadonlyArray<OrganizationDailyMetrics>,
    period: TimePeriod
): OrganizationMetricChartPoint[] {
    const granularity = getDashboardChartGranularity(period)
    const sortedMetrics = [...dailyMetrics].sort((a, b) => Number(a.date) - Number(b.date))

    if (granularity === "day") {
        return sortedMetrics.map((metric) => ({
            ...metric,
            viewToRequestConversion: calculateViewToRequestConversion(metric),
        }))
    }

    const buckets = new Map<string, OrganizationMetricAccumulator>()

    for (const metric of sortedMetrics) {
        const metricDate = parseMetricDate(metric.date)

        if (!metricDate) {
            continue
        }

        const bucketDate = getBucketDate(metricDate, granularity)
        const bucketKey = format(bucketDate, "yyyy-MM-dd")
        const existingBucket = buckets.get(bucketKey)

        if (existingBucket) {
            existingBucket.firstDate =
                metricDate < existingBucket.firstDate ? metricDate : existingBucket.firstDate
            existingBucket.lastDate =
                metricDate > existingBucket.lastDate ? metricDate : existingBucket.lastDate
            existingBucket.requestsReceived += metric.requestsReceived
            existingBucket.newVisitors += metric.newVisitors
            existingBucket.quotesGenerated += metric.quotesGenerated
            existingBucket.invoicesCreated += metric.invoicesCreated
            existingBucket.revenue += metric.revenue
            continue
        }

        buckets.set(bucketKey, {
            date: String(bucketDate.getTime()),
            firstDate: metricDate,
            lastDate: metricDate,
            requestsReceived: metric.requestsReceived,
            newVisitors: metric.newVisitors,
            quotesGenerated: metric.quotesGenerated,
            invoicesCreated: metric.invoicesCreated,
            revenue: metric.revenue,
        })
    }

    return Array.from(buckets.values())
        .sort((a, b) => Number(a.date) - Number(b.date))
        .map((bucket) => ({
            date: bucket.date,
            requestsReceived: bucket.requestsReceived,
            newVisitors: bucket.newVisitors,
            quotesGenerated: bucket.quotesGenerated,
            invoicesCreated: bucket.invoicesCreated,
            revenue: bucket.revenue,
            viewToRequestConversion: calculateViewToRequestConversion(bucket),
            tooltipLabel: formatBucketTooltipLabel(bucket, granularity),
        }))
}

export function createMemberMetricChartData(
    dailyMetrics: ReadonlyArray<MemberDailyMetrics>,
    period: TimePeriod
): MemberMetricChartPoint[] {
    const granularity = getDashboardChartGranularity(period)
    const sortedMetrics = [...dailyMetrics].sort((a, b) => Number(a.date) - Number(b.date))

    if (granularity === "day") {
        return sortedMetrics
    }

    const buckets = new Map<string, MemberMetricAccumulator>()

    for (const metric of sortedMetrics) {
        const metricDate = parseMetricDate(metric.date)

        if (!metricDate) {
            continue
        }

        const bucketDate = getBucketDate(metricDate, granularity)
        const bucketKey = format(bucketDate, "yyyy-MM-dd")
        const existingBucket = buckets.get(bucketKey)

        if (existingBucket) {
            existingBucket.firstDate =
                metricDate < existingBucket.firstDate ? metricDate : existingBucket.firstDate
            existingBucket.lastDate =
                metricDate > existingBucket.lastDate ? metricDate : existingBucket.lastDate
            existingBucket.requestsHandled += metric.requestsHandled
            existingBucket.quotesCreated += metric.quotesCreated
            existingBucket.invoicesCreated += metric.invoicesCreated
            existingBucket.revenue += metric.revenue
            existingBucket.messagesCount += metric.messagesCount
            continue
        }

        buckets.set(bucketKey, {
            date: String(bucketDate.getTime()),
            firstDate: metricDate,
            lastDate: metricDate,
            requestsHandled: metric.requestsHandled,
            quotesCreated: metric.quotesCreated,
            invoicesCreated: metric.invoicesCreated,
            revenue: metric.revenue,
            messagesCount: metric.messagesCount,
        })
    }

    return Array.from(buckets.values())
        .sort((a, b) => Number(a.date) - Number(b.date))
        .map((bucket) => ({
            date: bucket.date,
            requestsHandled: bucket.requestsHandled,
            quotesCreated: bucket.quotesCreated,
            invoicesCreated: bucket.invoicesCreated,
            revenue: bucket.revenue,
            messagesCount: bucket.messagesCount,
            tooltipLabel: formatBucketTooltipLabel(bucket, granularity),
        }))
}

function calculateViewToRequestConversion(
    metric: Pick<OrganizationDailyMetrics, "newVisitors" | "requestsReceived">
): number {
    return metric.newVisitors > 0 ? (metric.requestsReceived / metric.newVisitors) * 100 : 0
}

function parseMetricDate(value: string): Date | null {
    const timestamp = Number(value)

    if (!Number.isFinite(timestamp)) {
        return null
    }

    const date = new Date(timestamp)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return date
}

function formatBucketTooltipLabel(
    bucket: { firstDate: Date; lastDate: Date },
    granularity: Exclude<DashboardChartGranularity, "day">
): string {
    if (granularity === "month") {
        return format(startOfMonth(bucket.firstDate), "MMMM yyyy")
    }

    return formatDateRange(bucket.firstDate, bucket.lastDate)
}

function formatDateRange(startDate: Date, endDate: Date): string {
    if (isSameMonth(startDate, endDate) && isSameYear(startDate, endDate)) {
        return `${format(startDate, "MMM d")}-${format(endDate, "d, yyyy")}`
    }

    if (isSameYear(startDate, endDate)) {
        return `${format(startDate, "MMM d")}-${format(endDate, "MMM d, yyyy")}`
    }

    return `${format(startDate, "MMM d, yyyy")}-${format(endDate, "MMM d, yyyy")}`
}

function getBucketDate(
    metricDate: Date,
    granularity: Exclude<DashboardChartGranularity, "day">
): Date {
    if (granularity === "month") {
        return startOfMonth(metricDate)
    }

    return startOfWeek(metricDate, { weekStartsOn: 1 })
}
