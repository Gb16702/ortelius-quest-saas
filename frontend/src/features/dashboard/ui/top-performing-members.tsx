import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import { ToastPill } from "@/shared/ui/toast-pill"
import type { TimePeriod } from "../model/dashboard"
import { useTopRequestHandlers } from "../model/hooks/use-dashboard-data"

interface TopPerformingMembersProps {
    organizationId: string
    period?: TimePeriod
    className?: string
    onOpenMemberProfile?: (userId: string) => void
}

const SEGMENT_COUNT = 24

export function TopPerformingMembers({
    organizationId,
    period = 30,
    className,
    onOpenMemberProfile,
}: TopPerformingMembersProps) {
    const { t } = useTranslation("dashboard")
    const {
        data: members = [],
        error,
        isError,
        isLoading,
        refetch,
    } = useTopRequestHandlers(organizationId, period)
    const maxHandled = Math.max(...members.map((member) => member.requestsHandled), 0)

    if (isLoading) {
        return <TopPerformingMembersSkeleton className={className} />
    }

    return (
        <Card
            className={cn(
                "overflow-hidden rounded-lg border-none shadow-dashboard-card",
                className
            )}
        >
            <CardContent className="flex min-h-[360px] flex-col p-5">
                <div className="mb-8 space-y-2">
                    <h3 className="font-medium text-ds-fg-muted text-sm">
                        {t("topMembers.title")}
                    </h3>
                    <span className="block font-mono text-ds-fg-muted text-sm">
                        {formatPeriodLabel(period, t).toLocaleLowerCase()}
                    </span>
                </div>

                {isError ? (
                    <div className="flex flex-1 items-center justify-center">
                        <ToastPill
                            variant="error"
                            message={getQueryErrorMessage(error, t("topMembers.error"))}
                            action={{
                                label: t("common.retry"),
                                onClick: () => {
                                    void refetch()
                                },
                            }}
                            onDismiss={() => undefined}
                        />
                    </div>
                ) : members.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center text-ds-fg-muted text-sm">
                        {t("topMembers.empty")}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {members.map((memberData) => {
                            return (
                                <ContributorRow
                                    key={memberData.member.id}
                                    userId={memberData.member.id}
                                    name={memberData.member.name}
                                    requestsHandled={memberData.requestsHandled}
                                    maxHandled={maxHandled}
                                    onOpenProfile={onOpenMemberProfile}
                                />
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface ContributorRowProps {
    userId: string
    name: string
    requestsHandled: number
    maxHandled: number
    onOpenProfile?: (userId: string) => void
}

function ContributorRow({
    userId,
    name,
    requestsHandled,
    maxHandled,
    onOpenProfile,
}: ContributorRowProps) {
    return (
        <button
            type="button"
            className="-mx-2 block w-[calc(100%+1rem)] cursor-pointer space-y-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-ds-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-500"
            onClick={() => onOpenProfile?.(userId)}
            aria-label={name}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center">
                    <p className="truncate font-medium text-ds-fg text-sm">{name}</p>
                </div>
                <p className="shrink-0 font-medium font-mono text-ds-fg-muted text-sm tabular-nums">
                    {requestsHandled.toLocaleString()}
                </p>
            </div>
            <SegmentedWeightRail value={requestsHandled} maxValue={maxHandled} />
        </button>
    )
}

interface SegmentedWeightRailProps {
    value: number
    maxValue: number
}

function SegmentedWeightRail({ value, maxValue }: SegmentedWeightRailProps) {
    const activeSegments =
        maxValue > 0 ? Math.max(1, Math.round((value / maxValue) * SEGMENT_COUNT)) : 0

    return (
        <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
            {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
                <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: static decorative segment positions
                    key={index}
                    className={cn(
                        "h-1 rounded-full",
                        index < activeSegments ? "bg-ds-accent-700" : "bg-ds-gray-200"
                    )}
                    aria-hidden="true"
                />
            ))}
        </div>
    )
}

function TopPerformingMembersSkeleton({ className }: { className?: string }) {
    return (
        <Card
            className={cn(
                "overflow-hidden rounded-lg border-none shadow-dashboard-card",
                className
            )}
        >
            <CardContent className="flex min-h-[360px] flex-col p-5">
                <div className="mb-8 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="space-y-6">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                            key={index}
                            className="-mx-2 space-y-2.5 rounded-lg px-2 py-2"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex min-w-0 items-center">
                                    <Skeleton className="h-4 w-36" />
                                </div>
                                <Skeleton className="h-4 w-8" />
                            </div>
                            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
                                {Array.from({ length: SEGMENT_COUNT }).map((_, segmentIndex) => (
                                    <Skeleton
                                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton segments
                                        key={segmentIndex}
                                        className="h-1.5 rounded-full"
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function formatPeriodLabel(period: TimePeriod, t: ReturnType<typeof useTranslation>["t"]): string {
    if (period === 7) return t("timePeriod.last7Days")
    if (period === 14) return t("timePeriod.last14Days")
    if (period === 30) return t("timePeriod.last30Days")
    if (period === 90) return t("timePeriod.last3Months")
    if (period === 365) return t("timePeriod.last12Months")
    return t("comparison.previousDays", { count: period })
}

function getQueryErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    return fallback
}
