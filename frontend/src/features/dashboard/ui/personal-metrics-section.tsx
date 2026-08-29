import { useTranslation } from "react-i18next"
import { useActivityScore } from "@/entities/activity"
import { formatCurrency } from "@/shared/lib/currency"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import {
    createMemberMetricChartData,
    getDashboardChartGranularity,
} from "../lib/dashboard-metric-buckets"
import { calculateTrend } from "../lib/dashboard-metrics"
import type { TimePeriod } from "../model/dashboard"
import { useMemberMetrics } from "../model/hooks/use-member-metrics"
import { ActivityScoreCard } from "./activity-score-card"
import { MetricStatCard } from "./metric-stat-card"
import { MetricStatCardSkeleton } from "./metric-stat-card-skeleton"
import { TimeSeriesChart } from "./time-series-chart"
import { TimeSeriesChartSkeleton } from "./time-series-chart-skeleton"

interface PersonalMetricsSectionProps {
    userId: string
    organizationId: string
    organizationSlug: string
    className?: string
    period?: TimePeriod
}

export function PersonalMetricsSection({
    userId,
    organizationId,
    organizationSlug,
    className,
    period = 30,
}: PersonalMetricsSectionProps) {
    const { t } = useTranslation("dashboard")
    const {
        dailyMetrics,
        previousPeriodMetrics,
        isLoading,
        queryKey,
        hasData,
        isFetchedAfterMount,
        isFetching,
    } = useMemberMetrics(userId, organizationSlug, period)
    const { data: activityScore, isLoading: isActivityScoreLoading } = useActivityScore({
        organizationId,
        organizationSlug,
        actorId: userId,
        days: period,
    })
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey,
        hasData,
        isFetchedAfterMount,
        isFetching,
    })

    usePrimaryDataVisibleMetric({
        routeId: "org.dashboard.contributions",
        isVisible: !isLoading && hasData,
        dataSource: primaryDataSource,
        queryKey,
        itemCount: dailyMetrics.length,
        detail: { period },
    })

    const formatRevenueValue = (value: number) => formatCurrency(value, "EUR", 0)

    const formatPeriodLabel = (days: number) => {
        if (days === 7) return t("comparison.previous7Days")
        if (days === 14) return t("comparison.previous14Days")
        if (days === 30) return t("comparison.previous30Days")
        if (days === 90) return t("comparison.previous3Months")
        if (days === 365) return t("comparison.previous12Months")
        return t("comparison.previousDays", { count: days })
    }

    const formatCurrentPeriodLabel = (days: number) => {
        if (days === 7) return t("timePeriod.last7Days")
        if (days === 14) return t("timePeriod.last14Days")
        if (days === 30) return t("timePeriod.last30Days")
        if (days === 90) return t("timePeriod.last3Months")
        if (days === 365) return t("timePeriod.last12Months")
        return t("comparison.previousDays", { count: days })
    }

    const comparisonLabel = formatPeriodLabel(period)
    const currentPeriodLabel = formatCurrentPeriodLabel(period)
    const chartTrendLabel = currentPeriodLabel.toLocaleLowerCase()
    const chartGranularity = getDashboardChartGranularity(period)

    const periodRequestsHandled = dailyMetrics.reduce((sum, day) => sum + day.requestsHandled, 0)
    const periodQuotesCreated = dailyMetrics.reduce((sum, day) => sum + day.quotesCreated, 0)
    const periodRevenue = dailyMetrics.reduce((sum, day) => sum + day.revenue, 0)
    const periodMessagesCount = dailyMetrics.reduce((sum, day) => sum + day.messagesCount, 0)

    const previousRequestsHandled = previousPeriodMetrics.reduce(
        (sum, day) => sum + day.requestsHandled,
        0
    )
    const previousQuotesCreated = previousPeriodMetrics.reduce(
        (sum, day) => sum + day.quotesCreated,
        0
    )
    const previousRevenue = previousPeriodMetrics.reduce((sum, day) => sum + day.revenue, 0)
    const previousMessagesCount = previousPeriodMetrics.reduce(
        (sum, day) => sum + day.messagesCount,
        0
    )

    const recalculatedTrends = {
        requests: calculateTrend(periodRequestsHandled, previousRequestsHandled),
        quotes: calculateTrend(periodQuotesCreated, previousQuotesCreated),
        revenue: calculateTrend(periodRevenue, previousRevenue),
        messages: calculateTrend(periodMessagesCount, previousMessagesCount),
    }
    const activityScoreTrend = activityScore
        ? calculateTrend(activityScore.score, activityScore.previousScore)
        : null
    const chartData = createMemberMetricChartData(dailyMetrics, period)

    const metricsConfig = [
        {
            key: "requests",
            title: t("personalMetrics.requestsHandled.title"),
            value: periodRequestsHandled,
            trend: recalculatedTrends.requests ?? undefined,
        },
        {
            key: "quotes",
            title: t("personalMetrics.quotesCreated.title"),
            value: periodQuotesCreated,
            trend: recalculatedTrends.quotes ?? undefined,
        },
        {
            key: "revenue",
            title: t("personalMetrics.revenueGenerated.title"),
            value: formatRevenueValue(periodRevenue),
            trend: recalculatedTrends.revenue ?? undefined,
        },
        {
            key: "messages",
            title: t("personalMetrics.messagesSent.title"),
            value: periodMessagesCount,
            trend: recalculatedTrends.messages ?? undefined,
        },
    ] as const

    return (
        <div className="flex flex-col gap-6">
            <div className={className}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, index) => (
                              <div
                                  // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                                  key={index}
                                  className="border-ds-surface-border border-b last:border-b-0 xl:border-r xl:border-b-0 xl:last:border-r-0"
                              >
                                  <MetricStatCardSkeleton />
                              </div>
                          ))
                        : metricsConfig.map((metric) => (
                              <div
                                  key={metric.key}
                                  className="border-ds-surface-border border-b last:border-b-0 xl:border-r xl:border-b-0 xl:last:border-r-0"
                              >
                                  <MetricStatCard
                                      title={metric.title}
                                      value={metric.value}
                                      trend={metric.trend}
                                      comparisonLabel={comparisonLabel}
                                      periodLabel={currentPeriodLabel}
                                  />
                              </div>
                          ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                <div className="overflow-hidden rounded-lg shadow-dashboard-card">
                    {isLoading ? (
                        <TimeSeriesChartSkeleton className="!h-full rounded-none border-none" />
                    ) : (
                        <TimeSeriesChart
                            className="!h-full rounded-none border-none"
                            title={t("personalMetrics.messagesSent.title")}
                            value={periodMessagesCount}
                            trend={recalculatedTrends.messages ?? undefined}
                            trendLabel={chartTrendLabel}
                            hideYAxis
                            chartType="bar"
                            chartClassName="h-[240px]"
                            data={chartData}
                            dataKeys={[
                                {
                                    key: "messagesCount",
                                    label: t("personalMetrics.messagesSent.chartLabel"),
                                    color: "var(--color-ds-accent-700)",
                                },
                            ]}
                            period={period}
                            granularity={chartGranularity}
                        />
                    )}
                </div>
                <div className="overflow-hidden rounded-lg shadow-dashboard-card">
                    <ActivityScoreCard
                        className="rounded-none"
                        title={t("personalMetrics.activityScore.title")}
                        score={activityScore?.score}
                        trend={activityScoreTrend ?? undefined}
                        periodLabel={chartTrendLabel}
                        isLoading={isActivityScoreLoading}
                    />
                </div>
            </div>
        </div>
    )
}
