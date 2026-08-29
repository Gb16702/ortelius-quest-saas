import { type QueryKey, useQuery } from "@tanstack/react-query"
import {
    type OrganizationMetricsQueryData,
    organizationMetricsQueryOptions,
} from "../../api/dashboard.query-options"
import type { TimePeriod } from "../dashboard"
import type {
    OrganizationDailyMetrics,
    OrganizationMetricsResponse,
    OrganizationMetricsSummary,
} from "../schemas/dashboard.schema"

export type { OrganizationDailyMetrics, OrganizationMetricsResponse, OrganizationMetricsSummary }

interface UseOrganizationMetricsResult extends OrganizationMetricsQueryData {
    isLoading: boolean
    error: string | null
    queryKey: QueryKey
    hasData: boolean
    isFetchedAfterMount: boolean
    isFetching: boolean
    refetch: () => Promise<void>
}

interface UseOrganizationMetricsOptions {
    initialData?: OrganizationMetricsQueryData
}

export function useOrganizationMetrics(
    organizationSlug: string | undefined,
    days: TimePeriod = 30,
    options?: UseOrganizationMetricsOptions
): UseOrganizationMetricsResult {
    const queryOptions = organizationMetricsQueryOptions(organizationSlug, days)
    const { data, isLoading, error, refetch, isFetchedAfterMount, isFetching } = useQuery({
        ...queryOptions,
        enabled: !!organizationSlug,
        ...(options?.initialData !== undefined ? { initialData: options.initialData } : {}),
    })

    return {
        summary: data?.summary ?? null,
        dailyMetrics: data?.dailyMetrics ?? [],
        previousPeriodMetrics: data?.previousPeriodMetrics ?? [],
        trends: data?.trends ?? {
            requests: null,
            newVisitors: null,
            invoices: null,
            revenue: null,
        },
        isLoading,
        error: error?.message ?? null,
        queryKey: queryOptions.queryKey,
        hasData: Boolean(data),
        isFetchedAfterMount,
        isFetching,
        refetch: async () => {
            await refetch()
        },
    }
}
