import { useTranslation } from "react-i18next"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { ToastPill } from "@/shared/ui/toast-pill"
import {
    createOrganizationMetricChartData,
    getDashboardChartGranularity,
} from "../lib/dashboard-metric-buckets"
import { calculateTrend } from "../lib/dashboard-metrics"
import type { TimePeriod } from "../model/dashboard"
import { useOrganizationMetrics } from "../model/hooks/use-organization-metrics"
import { useRequestPipeline } from "../model/hooks/use-request-pipeline"
import { MetricStatCard } from "./metric-stat-card"
import { MetricStatCardSkeleton } from "./metric-stat-card-skeleton"
import { RequestPipeline } from "./request-pipeline"
import { TimeSeriesChart } from "./time-series-chart"
import { TimeSeriesChartSkeleton } from "./time-series-chart-skeleton"
import { TopPerformingMembers } from "./top-performing-members"

export interface OrganizationMetricsSectionProps {
    organizationId: string
    organizationSlug: string
    className?: string
    period?: TimePeriod
    onOpenMemberProfile?: (userId: string) => void
}

export function OrganizationMetricsSection({
    organizationId,
    organizationSlug,
    className,
    period = 30,
    onOpenMemberProfile,
}: OrganizationMetricsSectionProps) {
    const { t } = useTranslation("dashboard")
    const {
        summary,
        dailyMetrics,
        previousPeriodMetrics,
        isLoading,
        error: metricsError,
        queryKey,
        hasData,
        isFetchedAfterMount,
        isFetching,
        refetch: refetchMetrics,
    } = useOrganizationMetrics(organizationSlug, period)
    const { data: requestPipelineData } = useRequestPipeline(organizationId)
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey,
        hasData,
        isFetchedAfterMount,
        isFetching,
    })

    usePrimaryDataVisibleMetric({
        routeId: "org.dashboard.organization",
        isVisible: !isLoading && hasData,
        dataSource: primaryDataSource,
        queryKey,
        itemCount: dailyMetrics.length,
        detail: { period },
    })

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

    const periodTotalRequests = dailyMetrics.reduce((sum, day) => sum + day.requestsReceived, 0)
    const periodTotalNewVisitors = dailyMetrics.reduce((sum, day) => sum + day.newVisitors, 0)
    const periodTotalInvoices = dailyMetrics.reduce((sum, day) => sum + day.invoicesCreated, 0)
    const totalRequests =
        requestPipelineData?.total ?? summary?.totalRequests ?? periodTotalRequests
    const totalNewVisitors = summary?.totalNewVisitors ?? periodTotalNewVisitors
    const totalInvoices = summary?.totalInvoices ?? periodTotalInvoices

    const previousTotalRequests = previousPeriodMetrics.reduce(
        (sum, day) => sum + day.requestsReceived,
        0
    )
    const previousTotalNewVisitors = previousPeriodMetrics.reduce(
        (sum, day) => sum + day.newVisitors,
        0
    )
    const previousTotalInvoices = previousPeriodMetrics.reduce(
        (sum, day) => sum + day.invoicesCreated,
        0
    )
    const viewToRequestConversion =
        totalNewVisitors > 0 ? (totalRequests / totalNewVisitors) * 100 : 0
    const previousViewToRequestConversion =
        previousTotalNewVisitors > 0 ? (previousTotalRequests / previousTotalNewVisitors) * 100 : 0

    const recalculatedTrends = {
        requests: undefined,
        newVisitors: calculateTrend(totalNewVisitors, previousTotalNewVisitors),
        invoices: calculateTrend(totalInvoices, previousTotalInvoices),
        viewToRequestConversion: calculateTrend(
            viewToRequestConversion,
            previousViewToRequestConversion
        ),
    }

    const chartData = createOrganizationMetricChartData(dailyMetrics, period)

    const metricsConfig = [
        {
            key: "requests",
            title: t("organizationMetrics.totalRequests.title"),
            value: totalRequests,
            trend: recalculatedTrends.requests ?? undefined,
        },
        {
            key: "new-visitors",
            title: t("organizationMetrics.newVisitors.title"),
            value: totalNewVisitors,
            trend: recalculatedTrends.newVisitors ?? undefined,
        },
        {
            key: "view-to-request-conversion",
            title: t("organizationMetrics.viewToRequestConversion.title"),
            value: `${Math.round(viewToRequestConversion)}%`,
            trend: recalculatedTrends.viewToRequestConversion ?? undefined,
        },
        {
            key: "accepted-quotes",
            title: t("organizationMetrics.acceptedQuotes.title"),
            value: totalInvoices,
            trend: recalculatedTrends.invoices ?? undefined,
        },
    ] as const

    return (
        <div className="flex flex-col gap-6">
            <div className={className}>
                {metricsError ? (
                    <div className="flex min-h-[360px] items-center justify-center p-6">
                        <ToastPill
                            variant="error"
                            message={metricsError}
                            action={{
                                label: t("common.retry"),
                                onClick: () => {
                                    void refetchMetrics()
                                },
                            }}
                            onDismiss={() => undefined}
                        />
                    </div>
                ) : (
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
                )}
            </div>

            {!metricsError && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {isLoading ? (
                        <>
                            <TimeSeriesChartSkeleton
                                className="!h-full border-none shadow-dashboard-card"
                                height="h-[260px]"
                            />
                            <TimeSeriesChartSkeleton
                                className="!h-full border-none shadow-dashboard-card"
                                height="h-[260px]"
                            />
                        </>
                    ) : (
                        <>
                            <TimeSeriesChart
                                className="!h-full shadow-dashboard-card"
                                chartClassName="h-[260px]"
                                chartType="line"
                                title={t("organizationMetrics.viewToRequestConversion.title")}
                                value={`${Math.round(viewToRequestConversion)}%`}
                                trend={recalculatedTrends.viewToRequestConversion ?? undefined}
                                trendLabel={chartTrendLabel}
                                valueFormatter={(value) => `${Math.round(value)}%`}
                                hideYAxis
                                data={chartData}
                                dataKeys={[
                                    {
                                        key: "viewToRequestConversion",
                                        label: t(
                                            "organizationMetrics.viewToRequestConversion.chartLabel"
                                        ),
                                        color: "var(--color-ds-accent-700)",
                                    },
                                ]}
                                period={period}
                                granularity={chartGranularity}
                            />
                            <TimeSeriesChart
                                className="!h-full shadow-dashboard-card"
                                chartClassName="h-[260px]"
                                chartType="bar"
                                title={t("organizationMetrics.newVisitors.title")}
                                value={totalNewVisitors}
                                trend={recalculatedTrends.newVisitors ?? undefined}
                                trendLabel={chartTrendLabel}
                                hideYAxis
                                data={chartData}
                                dataKeys={[
                                    {
                                        key: "newVisitors",
                                        label: t("organizationMetrics.newVisitors.chartLabel"),
                                        color: "var(--color-ds-accent-700)",
                                    },
                                ]}
                                period={period}
                                granularity={chartGranularity}
                            />
                        </>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RequestPipeline organizationId={organizationId} />
                <TopPerformingMembers
                    organizationId={organizationId}
                    period={period}
                    onOpenMemberProfile={onOpenMemberProfile}
                />
            </div>
        </div>
    )
}
