import { Clock, MoreHorizontal } from "lucide-react"
import { createParser, parseAsString, useQueryState } from "nuqs"
import { Suspense, useEffect, useState } from "react"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import {
    OrganizationMetricsSection,
    parseDashboardTimePeriod,
    type TimePeriod,
} from "@/features/dashboard"
import { useMemberProfileDialog } from "@/features/members"
import {
    preloadShareCompanyPageDialogContent,
    ShareCompanyPageDialog,
} from "@/features/organization"
import { useIdlePreload } from "@/shared/lib/performance/use-idle-preload"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"

const TIME_PERIOD_OPTIONS = [
    { label: "Last 7 days", value: 7 },
    { label: "Last 14 days", value: 14 },
    { label: "Last 30 days", value: 30 },
    { label: "Last 3 months", value: 90 },
    { label: "Last 12 months", value: 365 },
]

const timePeriodParser = createParser<TimePeriod>({
    parse: parseDashboardTimePeriod,
    serialize: (value) => String(value),
}).withDefault(30)

export function OrgDashboardOrganizationPage() {
    const { state, meta } = useOrg()
    const { openProfile } = useMemberProfileDialog()
    const slug = meta.slug
    const [action, setAction] = useQueryState(
        "action",
        parseAsString.withOptions({ shallow: true, clearOnDefault: true })
    )

    const organizationData = state.org

    const [period, setPeriod] = useQueryState("period", timePeriodParser)

    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const shareDialogPreload = useIdlePreload(preloadShareCompanyPageDialogContent)

    useEffect(() => {
        if (action === "share") {
            void shareDialogPreload.preload()
            setShareDialogOpen(true)
        }
    }, [action, shareDialogPreload.preload])

    const closeShareDialog = () => {
        setShareDialogOpen(false)
        if (action !== null) {
            void setAction(null)
        }
    }

    const homeUrl =
        typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/` : ""

    const handlePeriodChange = (value: string) => {
        const nextPeriod = parseDashboardTimePeriod(value)
        if (nextPeriod !== null) {
            setPeriod(nextPeriod)
        }
    }

    const handleShareCompanyPageIntent = () => {
        void shareDialogPreload.preload()
    }

    const handleShareCompanyPage = () => {
        void shareDialogPreload.preload()
        setShareDialogOpen(true)
    }

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: "Dashboard", href: `/org/${slug}/dashboard` },
                    { label: "Organization Overview" },
                ])}
            />
            <ProfilePageHead
                title="Organization Overview"
                subtitle="Track your organization metrics."
            />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-[theme(width.7xl)] flex-col gap-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                        <Select value={String(period)} onValueChange={handlePeriodChange}>
                            <SelectTrigger size="sm" aria-label="Time period" className="w-[200px]">
                                <div className="flex flex-row items-center gap-2">
                                    <Clock className="size-4 text-ds-fg-muted" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="min-w-[200px]" align="end">
                                {TIME_PERIOD_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={String(option.value)}
                                        value={String(option.value)}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    radius="sm"
                                    className="h-8 w-8 p-0"
                                    onFocus={handleShareCompanyPageIntent}
                                    onPointerDown={handleShareCompanyPageIntent}
                                    onPointerEnter={handleShareCompanyPageIntent}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={handleShareCompanyPage}
                                    onFocus={handleShareCompanyPageIntent}
                                    onPointerDown={handleShareCompanyPageIntent}
                                    onPointerEnter={handleShareCompanyPageIntent}
                                >
                                    Share company page
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Suspense fallback={null}>
                        <OrganizationMetricsSection
                            className="overflow-hidden rounded-lg shadow-dashboard-card"
                            organizationId={organizationData.id}
                            organizationSlug={organizationData.slug}
                            period={period}
                            onOpenMemberProfile={openProfile}
                        />
                    </Suspense>
                </div>
            </div>

            {shareDialogOpen && (
                <ShareCompanyPageDialog
                    isOpen={shareDialogOpen}
                    onClose={closeShareDialog}
                    currentUrl={homeUrl}
                    organizationId={organizationData.id}
                    organizationSlug={meta.slug}
                />
            )}
        </div>
    )
}
