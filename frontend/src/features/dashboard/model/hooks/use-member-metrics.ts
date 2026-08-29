import { type QueryKey, useQuery } from "@tanstack/react-query"
import {
    type MemberMetricsQueryData,
    memberMetricsQueryOptions,
} from "../../api/dashboard.query-options"
import type { TimePeriod } from "../dashboard"
import type {
    MemberDailyMetrics,
    MemberMetricsResponse,
    MemberMetricsSummary,
} from "../schemas/dashboard.schema"

export type { MemberDailyMetrics, MemberMetricsResponse, MemberMetricsSummary }

interface UseMemberMetricsResult extends MemberMetricsQueryData {
    isLoading: boolean
    error: string | null
    queryKey: QueryKey
    hasData: boolean
    isFetchedAfterMount: boolean
    isFetching: boolean
    refetch: () => Promise<void>
}

interface UseMemberMetricsOptions {
    initialData?: MemberMetricsQueryData
}

export function useMemberMetrics(
    userId: string | undefined,
    organizationSlug: string | undefined,
    days: TimePeriod = 30,
    options?: UseMemberMetricsOptions
): UseMemberMetricsResult {
    const queryOptions = memberMetricsQueryOptions(userId, organizationSlug, days)
    const { data, isLoading, error, refetch, isFetchedAfterMount, isFetching } = useQuery({
        ...queryOptions,
        enabled: !!userId && !!organizationSlug,
        ...(options?.initialData !== undefined ? { initialData: options.initialData } : {}),
    })

    return {
        summary: data?.summary ?? null,
        dailyMetrics: data?.dailyMetrics ?? [],
        previousPeriodMetrics: data?.previousPeriodMetrics ?? [],
        trends: data?.trends ?? {
            requests: null,
            quotes: null,
            revenue: null,
            messages: null,
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
