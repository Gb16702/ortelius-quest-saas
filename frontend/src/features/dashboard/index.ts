import { lazy } from "react"
import type { OrganizationMetricsSectionProps } from "./ui/organization-metrics-section"

export type {
    MemberMetricsQueryData,
    OrganizationMetricsQueryData,
} from "./api/dashboard.query-options"
export {
    memberMetricsQueryOptions,
    organizationMetricsQueryOptions,
} from "./api/dashboard.query-options"
export {
    DEFAULT_DASHBOARD_PERIOD,
    getDashboardTimePeriodFromSearchParams,
    parseDashboardTimePeriod,
} from "./lib/dashboard-time-period"
export type { TimePeriod } from "./model/dashboard"
export { timePeriodSchema } from "./model/schemas/dashboard.schema"
export { PersonalMetricsSection } from "./ui/personal-metrics-section"

export const OrganizationMetricsSection = lazy(() =>
    import("./ui/organization-metrics-section").then((module) => ({
        default: module.OrganizationMetricsSection,
    }))
) satisfies React.LazyExoticComponent<(props: OrganizationMetricsSectionProps) => React.JSX.Element>
