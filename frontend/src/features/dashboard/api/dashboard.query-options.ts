import { queryOptions } from "@tanstack/react-query"
import { graphqlQueryData } from "@/shared/api/graphql"
import type { TrendData } from "../lib/dashboard-metrics"
import { calculateTrend, sumDailyMetrics } from "../lib/dashboard-metrics"
import type { TimePeriod } from "../model/dashboard"
import {
    type CombinedMemberMetricsData,
    type CombinedOrganizationMetricsData,
    combinedMemberMetricsDataSchema,
    combinedOrganizationMetricsDataSchema,
    type MemberDailyMetrics,
    type MemberMetricsSummary,
    type OrganizationDailyMetrics,
    type OrganizationMetricsSummary,
} from "../model/schemas/dashboard.schema"
import { dashboardKeys } from "./dashboard.query-keys"
import {
    COMBINED_MEMBER_METRICS_QUERY,
    COMBINED_ORGANIZATION_METRICS_QUERY,
} from "./graphql.queries"

export interface MemberMetricsQueryData {
    summary: MemberMetricsSummary | null
    dailyMetrics: MemberDailyMetrics[]
    previousPeriodMetrics: MemberDailyMetrics[]
    trends: {
        requests: TrendData | null
        quotes: TrendData | null
        revenue: TrendData | null
        messages: TrendData | null
    }
}

export interface OrganizationMetricsQueryData {
    summary: OrganizationMetricsSummary | null
    dailyMetrics: OrganizationDailyMetrics[]
    previousPeriodMetrics: OrganizationDailyMetrics[]
    trends: {
        requests: TrendData | null
        newVisitors: TrendData | null
        invoices: TrendData | null
        revenue: TrendData | null
    }
}

export function memberMetricsQueryOptions(
    userId: string | undefined,
    organizationSlug: string | undefined,
    days: TimePeriod = 30
) {
    return queryOptions({
        queryKey: dashboardKeys.memberMetrics(organizationSlug, userId, days),
        queryFn: () => fetchMemberMetrics(userId, organizationSlug, days),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })
}

export function organizationMetricsQueryOptions(
    organizationSlug: string | undefined,
    days: TimePeriod = 30
) {
    return queryOptions({
        queryKey: dashboardKeys.organizationMetrics(organizationSlug, days),
        queryFn: () => fetchOrganizationMetrics(organizationSlug, days),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })
}

export function createMemberMetricsQueryData(
    data: CombinedMemberMetricsData
): MemberMetricsQueryData {
    const sortedMetrics = [...data.memberDailyMetrics].sort(
        (a, b) => Number(a.date) - Number(b.date)
    )
    const midPoint = Math.floor(sortedMetrics.length / 2)
    const previousPeriodMetrics = sortedMetrics.slice(0, midPoint)
    const dailyMetrics = sortedMetrics.slice(midPoint)

    const previousRequests = sumDailyMetrics(previousPeriodMetrics, "requestsHandled")
    const currentRequests = sumDailyMetrics(dailyMetrics, "requestsHandled")
    const previousQuotes = sumDailyMetrics(previousPeriodMetrics, "quotesCreated")
    const currentQuotes = sumDailyMetrics(dailyMetrics, "quotesCreated")
    const previousRevenue = sumDailyMetrics(previousPeriodMetrics, "revenue")
    const currentRevenue = sumDailyMetrics(dailyMetrics, "revenue")
    const previousMessages = sumDailyMetrics(previousPeriodMetrics, "messagesCount")
    const currentMessages = sumDailyMetrics(dailyMetrics, "messagesCount")

    return {
        summary: data.memberMetricsSummary,
        dailyMetrics,
        previousPeriodMetrics,
        trends: {
            requests: calculateTrend(currentRequests, previousRequests),
            quotes: calculateTrend(currentQuotes, previousQuotes),
            revenue: calculateTrend(currentRevenue, previousRevenue),
            messages: calculateTrend(currentMessages, previousMessages),
        },
    }
}

export function createOrganizationMetricsQueryData(
    data: CombinedOrganizationMetricsData
): OrganizationMetricsQueryData {
    const sortedMetrics = [...data.organizationDailyMetrics].sort(
        (a, b) => Number(a.date) - Number(b.date)
    )
    const midPoint = Math.floor(sortedMetrics.length / 2)
    const previousPeriodMetrics = sortedMetrics.slice(0, midPoint)
    const dailyMetrics = sortedMetrics.slice(midPoint)

    const previousRequests = sumDailyMetrics(previousPeriodMetrics, "requestsReceived")
    const currentRequests = sumDailyMetrics(dailyMetrics, "requestsReceived")
    const previousNewVisitors = sumDailyMetrics(previousPeriodMetrics, "newVisitors")
    const currentNewVisitors = sumDailyMetrics(dailyMetrics, "newVisitors")
    const previousInvoices = sumDailyMetrics(previousPeriodMetrics, "invoicesCreated")
    const currentInvoices = sumDailyMetrics(dailyMetrics, "invoicesCreated")
    const previousRevenue = sumDailyMetrics(previousPeriodMetrics, "revenue")
    const currentRevenue = sumDailyMetrics(dailyMetrics, "revenue")

    return {
        summary: data.organizationMetricsSummary,
        dailyMetrics,
        previousPeriodMetrics,
        trends: {
            requests: calculateTrend(currentRequests, previousRequests),
            newVisitors: calculateTrend(currentNewVisitors, previousNewVisitors),
            invoices: calculateTrend(currentInvoices, previousInvoices),
            revenue: calculateTrend(currentRevenue, previousRevenue),
        },
    }
}

export async function fetchMemberMetrics(
    userId: string | undefined,
    organizationSlug: string | undefined,
    days: TimePeriod
): Promise<MemberMetricsQueryData> {
    if (!userId || !organizationSlug) {
        throw new Error("User ID and organization slug are required")
    }

    const data = await graphqlQueryData(
        {
            query: COMBINED_MEMBER_METRICS_QUERY,
            variables: { userId, organizationSlug, days: days * 2 },
        },
        combinedMemberMetricsDataSchema
    )

    return createMemberMetricsQueryData(data)
}

export async function fetchOrganizationMetrics(
    organizationSlug: string | undefined,
    days: TimePeriod
): Promise<OrganizationMetricsQueryData> {
    if (!organizationSlug) {
        throw new Error("Organization slug is required")
    }

    const data = await graphqlQueryData(
        {
            query: COMBINED_ORGANIZATION_METRICS_QUERY,
            variables: { slug: organizationSlug, summaryDays: days, dailyDays: days * 2 },
        },
        combinedOrganizationMetricsDataSchema
    )

    return createOrganizationMetricsQueryData(data)
}
