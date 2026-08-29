import { OrganizationMetricsSection, type TimePeriod } from "@/features/dashboard"

interface OrgDashboardOrganizationSectionProps {
    organizationId: string
    organizationSlug: string
    period: TimePeriod
    onOpenMemberProfile?: (userId: string) => void
}

export function OrgDashboardOrganizationSection({
    organizationId,
    organizationSlug,
    period,
    onOpenMemberProfile,
}: OrgDashboardOrganizationSectionProps) {
    return (
        <OrganizationMetricsSection
            className="overflow-hidden rounded-lg shadow-dashboard-card"
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            period={period}
            onOpenMemberProfile={onOpenMemberProfile}
        />
    )
}
