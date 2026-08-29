import { InvoicesPageContent, InvoicesPageProvider } from "@/features/organization-invoice-settings"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"

interface OrgSettingsInvoicesPageProps {
    organizationId: string
}

export function OrgSettingsInvoicesPage({ organizationId }: OrgSettingsInvoicesPageProps) {
    usePrimaryDataVisibleMetric({
        routeId: "org.settings.invoices",
        isVisible: Boolean(organizationId),
        dataSource: "warm-cache",
        detail: { source: "settings-layout-id" },
    })

    return (
        <InvoicesPageProvider organizationId={organizationId}>
            <InvoicesPageContent />
        </InvoicesPageProvider>
    )
}
