import { useTranslation } from "react-i18next"
import { useOrganizationBusinessSettings } from "@/entities/organization"
import type { OrganizationBusinessCatalogItem } from "@/entities/organization-business-catalog"
import {
    BusinessPageContent,
    BusinessPageProvider,
} from "@/features/organization-business-settings"
import { getErrorMessage } from "@/shared/lib/error"
import { SettingsPageLoadError, SettingsPageSkeleton } from "@/widgets/org-settings-page-state"
import { PricingDataDialog } from "./pricing-data-dialog"

interface OrgSettingsBusinessPageProps {
    organizationId: string
    initialCategories?: OrganizationBusinessCatalogItem[]
    initialServices?: OrganizationBusinessCatalogItem[]
}

export function OrgSettingsBusinessPage({
    organizationId,
    initialCategories,
    initialServices,
}: OrgSettingsBusinessPageProps) {
    const { t } = useTranslation("settings")
    const organizationInfoQuery = useOrganizationBusinessSettings(organizationId)
    const orgInfo = organizationInfoQuery.data
    const title = t("business.title")

    if (!orgInfo) {
        if (organizationInfoQuery.isError) {
            return (
                <SettingsPageLoadError
                    title={title}
                    message={getErrorMessage(organizationInfoQuery.error, t("business.loadError"))}
                    onRetry={() => {
                        void organizationInfoQuery.refetch()
                    }}
                />
            )
        }

        return <SettingsPageSkeleton title={title} />
    }

    return (
        <BusinessPageProvider
            orgInfo={orgInfo}
            initialCategories={initialCategories}
            initialServices={initialServices}
        >
            <BusinessPageContent
                renderPricingDataDialog={(props) =>
                    props.open ? <PricingDataDialog {...props} /> : null
                }
            />
        </BusinessPageProvider>
    )
}
