import { Clock } from "lucide-react"
import { createParser, parseAsString, useQueryState } from "nuqs"
import { lazy, Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import {
    PersonalMetricsSection,
    parseDashboardTimePeriod,
    type TimePeriod,
} from "@/features/dashboard"
import { useMemberProfileDialog } from "@/features/members"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Skeleton } from "@/shared/ui/skeleton"
import { showSuccessToast } from "@/shared/ui/toasts"

const OrgDashboardOrganizationSection = lazy(() =>
    import("./org-dashboard-organization-section").then((module) => ({
        default: module.OrgDashboardOrganizationSection,
    }))
)

const timePeriodParser = createParser<TimePeriod>({
    parse: parseDashboardTimePeriod,
    serialize: (value) => String(value),
}).withDefault(30)

interface OrgDashboardPageProps {
    sessionData: SessionResponse | null
}

export function OrgDashboardPage({ sessionData }: OrgDashboardPageProps) {
    const { t } = useTranslation("dashboard")
    const { state, meta } = useOrg()
    const { openProfile } = useMemberProfileDialog()
    const slug = meta.slug

    const userId = sessionData?.user?.id ?? ""
    const organizationData = state.org
    const isAdmin = state.isAdmin

    const [period, setPeriod] = useQueryState("period", timePeriodParser)
    const [joined, setJoined] = useQueryState(
        "joined",
        parseAsString.withOptions({ shallow: true, clearOnDefault: true })
    )

    useEffect(() => {
        if (joined === "true") {
            showSuccessToast(t("toasts.organizationJoined"))
            void setJoined(null)
        }
    }, [joined, setJoined, t])

    const timePeriodOptions = [
        { label: t("timePeriod.last7Days"), value: 7 },
        { label: t("timePeriod.last14Days"), value: 14 },
        { label: t("timePeriod.last30Days"), value: 30 },
        { label: t("timePeriod.last3Months"), value: 90 },
        { label: t("timePeriod.last12Months"), value: 365 },
    ]

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: t("breadcrumb"), href: `/org/${slug}/dashboard` },
                ])}
            />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-5xl flex-col gap-12 py-6">
                    <section className="flex flex-col gap-4 pt-4">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="font-medium text-ds-fg text-xl">
                                {t("sections.myContributions.title")}
                            </h2>
                            <Select
                                value={String(period)}
                                onValueChange={(value) => {
                                    const nextPeriod = parseDashboardTimePeriod(value)
                                    if (nextPeriod !== null) {
                                        setPeriod(nextPeriod)
                                    }
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label={t("timePeriod.ariaLabel", {
                                        defaultValue: "Time period",
                                    })}
                                    className="w-[200px]"
                                >
                                    <div className="flex flex-row items-center gap-2">
                                        <Clock className="size-4 text-ds-fg-muted" />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="min-w-[200px]" align="end">
                                    {timePeriodOptions.map((option) => (
                                        <SelectItem
                                            key={String(option.value)}
                                            value={String(option.value)}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <PersonalMetricsSection
                            className="overflow-hidden rounded-lg shadow-dashboard-card"
                            userId={userId}
                            organizationId={organizationData.id}
                            organizationSlug={organizationData.slug}
                            period={period}
                        />
                    </section>

                    {isAdmin && (
                        <section className="flex flex-col gap-4">
                            <h2 className="font-medium text-[22px] text-ds-fg">
                                {t("sections.organizationOverview.title")}
                            </h2>
                            <Suspense fallback={<DashboardOrganizationSectionFallback />}>
                                <OrgDashboardOrganizationSection
                                    organizationId={organizationData.id}
                                    organizationSlug={organizationData.slug}
                                    period={period}
                                    onOpenMemberProfile={openProfile}
                                />
                            </Suspense>
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}

function DashboardOrganizationSectionFallback() {
    return (
        <div className="overflow-hidden rounded-lg shadow-dashboard-card">
            <div className="flex border-ds-surface-border border-b">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        key={index}
                        className="w-full max-w-[240px] flex-shrink-0 border-ds-surface-border border-r p-4"
                    >
                        <Skeleton className="mb-3 h-4 w-24" />
                        <Skeleton className="mb-2 h-7 w-16" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ))}
            </div>
            <div className="flex h-[350px] items-end gap-2 p-8 pl-6">
                {Array.from({ length: 15 }).map((_, index) => (
                    <Skeleton
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        key={index}
                        className="flex-1 rounded-t"
                        style={{ height: `${20 + ((index * 17) % 58)}%` }}
                    />
                ))}
            </div>
        </div>
    )
}
