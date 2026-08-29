import type { TimePeriod } from "../model/dashboard"

export const dashboardKeys = {
    all: ["dashboard"] as const,
    organization: (organizationSlug: string | undefined) =>
        [...dashboardKeys.all, "organization", organizationSlug ?? null] as const,
    organizationMetrics: (organizationSlug: string | undefined, days: TimePeriod) =>
        [...dashboardKeys.organization(organizationSlug), "metrics", days] as const,
    requestPipeline: (organizationId: string | undefined, variant: "unique-all" = "unique-all") =>
        [...dashboardKeys.all, "request-pipeline", organizationId ?? null, variant] as const,
    requestsAggregation: (organizationSlug: string, days: number) =>
        [...dashboardKeys.organization(organizationSlug), "requests-aggregation", days] as const,
    topRequestHandlers: (organizationId: string | undefined, days: number) =>
        [
            ...dashboardKeys.all,
            "top-request-handlers",
            organizationId ?? null,
            days,
            "unique-requests",
        ] as const,
    recentActivity: (organizationSlug: string, organizationId: string | null, limit: number) =>
        [
            ...dashboardKeys.organization(organizationSlug),
            "recent-activity",
            organizationId,
            limit,
        ] as const,
    member: (organizationSlug: string | undefined, userId: string | undefined) =>
        [...dashboardKeys.organization(organizationSlug), "member", userId ?? null] as const,
    memberMetrics: (
        organizationSlug: string | undefined,
        userId: string | undefined,
        days: TimePeriod
    ) => [...dashboardKeys.member(organizationSlug, userId), "metrics", days] as const,
}
