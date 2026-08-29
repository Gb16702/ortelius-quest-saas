import { useTranslation } from "react-i18next"
import { organizationSettingsKeys, useOrganizationBrandingSettings } from "@/entities/organization"
import {
    BrandingPageContent,
    BrandingPageProvider,
} from "@/features/organization-branding-settings"
import { getErrorMessage } from "@/shared/lib/error"
import { getQueryPrimaryDataSource } from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { SettingsPageLoadError, SettingsPageSkeleton } from "@/widgets/org-settings-page-state"

interface OrgSettingsBrandingPageProps {
    organizationId: string
}

export function OrgSettingsBrandingPage({ organizationId }: OrgSettingsBrandingPageProps) {
    const { t } = useTranslation("settings")
    const organizationInfoQuery = useOrganizationBrandingSettings(organizationId)
    const orgInfo = organizationInfoQuery.data
    const organizationInfoQueryKey = organizationSettingsKeys.detail(organizationId)
    const dataSource = getQueryPrimaryDataSource({
        queryKey: organizationInfoQueryKey,
        hasData: Boolean(orgInfo),
        isFetchedAfterMount: organizationInfoQuery.isFetchedAfterMount,
        isFetching: organizationInfoQuery.isFetching,
    })

    usePrimaryDataVisibleMetric({
        routeId: "org.settings.branding",
        isVisible: Boolean(orgInfo),
        dataSource,
        queryKey: organizationInfoQueryKey,
        detail: { source: "client-query" },
    })

    const title = t("branding.title")
    const subtitle = t("branding.subtitle")

    if (!orgInfo) {
        if (organizationInfoQuery.isError) {
            return (
                <SettingsPageLoadError
                    title={title}
                    subtitle={subtitle}
                    message={getErrorMessage(organizationInfoQuery.error, t("branding.loadError"))}
                    onRetry={() => {
                        void organizationInfoQuery.refetch()
                    }}
                />
            )
        }

        return <SettingsPageSkeleton title={title} subtitle={subtitle} />
    }

    return (
        <BrandingPageProvider orgInfo={orgInfo}>
            <BrandingPageContent />
        </BrandingPageProvider>
    )
}
