import { useTranslation } from "react-i18next"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import {
    LegalDocumentDeleteDialog,
    LegalDocumentRenameDialog,
    LegalDocumentsProvider,
    LegalDocumentsTable,
    LegalDocumentsUploadZone,
} from "@/features/legal-documents"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"

function OrgSettingsLegalsPageContent() {
    const { t } = useTranslation("settings")
    const { state, meta } = useOrg()
    usePrimaryDataVisibleMetric({
        routeId: "org.settings.legals",
        isVisible: true,
        dataSource: "warm-cache",
        detail: { source: "org-context" },
    })

    return (
        <div className="flex w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: t("nav.settings"), href: `/org/${meta.slug}/settings` },
                    { label: t("nav.legals") },
                ])}
            />
            <ProfilePageHead title={t("legalDocuments.title")} maxWidth="4xl" />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-4xl flex-col gap-6 py-6">
                    <LegalDocumentsUploadZone />
                    <LegalDocumentsTable />
                    <LegalDocumentRenameDialog />
                    <LegalDocumentDeleteDialog />
                </div>
            </div>
        </div>
    )
}

export function OrgSettingsLegalsPage() {
    return (
        <LegalDocumentsProvider>
            <OrgSettingsLegalsPageContent />
        </LegalDocumentsProvider>
    )
}
