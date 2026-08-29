import { parseAsString, useQueryState } from "nuqs"
import { useTranslation } from "react-i18next"
import * as v from "valibot"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import {
    BillingAddressCard,
    CancelSubscriptionCard,
    InvoiceEmailCard,
    InvoiceLanguageCard,
    SubscriptionCard,
    TaxInformationCard,
} from "@/features/subscription"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { BillingSettingsSection } from "./billing-settings-section"

const billingIntentPlanSearchSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const billingIntentPeriodSearchSchema = v.picklist(["monthly", "yearly"])

interface OrgSettingsBillingPageProps {
    organizationId: string
}

export function OrgSettingsBillingPage({ organizationId }: OrgSettingsBillingPageProps) {
    const { t } = useTranslation("settings")
    const { state, meta } = useOrg()
    usePrimaryDataVisibleMetric({
        routeId: "org.settings.billing",
        isVisible: Boolean(organizationId),
        dataSource: "warm-cache",
        detail: { source: "settings-layout-id" },
    })

    const slug = meta.slug
    const [planSearchParam] = useQueryState("plan", parseAsString)
    const [billingSearchParam] = useQueryState("billing", parseAsString)
    const intentPlanResult = safeParseSchema(billingIntentPlanSearchSchema, planSearchParam)
    const intentPlan = intentPlanResult.success ? intentPlanResult.data : null
    const billingParamResult = safeParseSchema(billingIntentPeriodSearchSchema, billingSearchParam)
    const billingParam = billingParamResult.success ? billingParamResult.data : null
    const intentBillingInterval =
        billingParam === "yearly" ? "annual" : billingParam === "monthly" ? "monthly" : undefined
    const autoOpenManage = intentPlan !== null

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: t("nav.settings"), href: `/org/${slug}/settings` },
                    { label: t("nav.billing") },
                ])}
            />
            <ProfilePageHead title={t("billing.title")} maxWidth="4xl" />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-4xl flex-col py-6">
                    <div className="space-y-12">
                        <SubscriptionCard
                            intentBillingInterval={intentBillingInterval}
                            autoOpenManage={autoOpenManage}
                        />
                        <BillingSettingsSection title={t("billing.sections.details.title")}>
                            <BillingAddressCard />
                            <TaxInformationCard />
                        </BillingSettingsSection>
                        <BillingSettingsSection title={t("billing.sections.invoice.title")}>
                            <InvoiceEmailCard />
                            <InvoiceLanguageCard />
                        </BillingSettingsSection>
                        <CancelSubscriptionCard />
                    </div>
                </div>
            </div>
        </div>
    )
}
