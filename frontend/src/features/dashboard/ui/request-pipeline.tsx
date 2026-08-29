import { useTranslation } from "react-i18next"
import { getRequestStatusDisplay, RequestStatusDisplay } from "@/entities/request"
import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import { ToastPill } from "@/shared/ui/toast-pill"
import {
    type RequestPipelineSegment,
    useRequestPipeline,
} from "../model/hooks/use-request-pipeline"

interface RequestPipelineProps {
    organizationId: string
    className?: string
}

export function RequestPipeline({ organizationId, className }: RequestPipelineProps) {
    const { t } = useTranslation("dashboard")
    const { data, error, isError, isLoading, refetch } = useRequestPipeline(organizationId)

    if (isLoading) {
        return <RequestPipelineSkeleton className={className} />
    }

    return (
        <Card
            className={cn(
                "flex flex-col overflow-hidden rounded-lg border-none shadow-dashboard-card",
                className
            )}
        >
            <CardContent className="flex min-h-[344px] flex-1 flex-col p-5">
                {isError ? (
                    <div className="flex flex-1 items-center justify-center">
                        <ToastPill
                            variant="error"
                            message={getQueryErrorMessage(error, t("requestPipeline.error"))}
                            action={{
                                label: t("common.retry"),
                                onClick: () => {
                                    void refetch()
                                },
                            }}
                            onDismiss={() => undefined}
                        />
                    </div>
                ) : data && data.total > 0 ? (
                    <RequestPipelineContent total={data.total} segments={data.segments} />
                ) : (
                    <div className="flex flex-1 items-center justify-center text-ds-fg-muted text-sm">
                        {t("requestPipeline.empty")}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface RequestPipelineContentProps {
    total: number
    segments: RequestPipelineSegment[]
}

function RequestPipelineContent({ total, segments }: RequestPipelineContentProps) {
    const { t } = useTranslation("dashboard")
    const visibleSegments = segments.slice(0, 5)

    return (
        <>
            <div className="mb-3">
                <div className="text-ds-fg-muted text-sm">{t("requestPipeline.title")}</div>
                <div className="mt-3 font-medium text-[28px] text-ds-fg tabular-nums">
                    {total.toLocaleString()}
                </div>
            </div>

            <SegmentedStatusBar segments={visibleSegments} />
            <StatusLegend segments={visibleSegments} />

            <div className="mt-7 grid grid-cols-[minmax(0,1fr)_88px_72px] gap-x-4 font-medium text-ds-fg-muted text-xs">
                <span>{t("requestPipeline.table.status")}</span>
                <span>{t("requestPipeline.table.share")}</span>
                <span>{t("requestPipeline.table.total")}</span>
            </div>

            <div className="mt-3 flex flex-col gap-1">
                {visibleSegments.map((segment) => (
                    <StatusRow key={segment.status} segment={segment} />
                ))}
            </div>
        </>
    )
}

interface StatusSegmentsProps {
    segments: RequestPipelineSegment[]
}

function SegmentedStatusBar({ segments }: StatusSegmentsProps) {
    return (
        <div className="flex h-4 gap-2">
            {segments.map((segment) => {
                const display = getRequestStatusDisplay(segment.status)

                return (
                    <div
                        key={segment.status}
                        className={cn("min-w-8 rounded-full", display.colorClassName)}
                        style={{ flexGrow: Math.max(segment.count, 1) }}
                    />
                )
            })}
        </div>
    )
}

function StatusLegend({ segments }: StatusSegmentsProps) {
    const { t } = useTranslation("requests")

    return (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {segments.map((segment) => {
                const display = getRequestStatusDisplay(segment.status)

                return (
                    <div key={segment.status} className="flex min-w-0 items-center gap-2">
                        <span
                            className={cn("h-2 w-2 shrink-0 rounded-full", display.colorClassName)}
                        />
                        <span className="truncate font-medium font-mono text-ds-fg-muted text-xs">
                            {t(display.labelKey, { defaultValue: display.fallbackLabel })}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

interface StatusRowProps {
    segment: RequestPipelineSegment
}

function StatusRow({ segment }: StatusRowProps) {
    const { t } = useTranslation("requests")
    const display = getRequestStatusDisplay(segment.status)
    const label = t(display.labelKey, { defaultValue: display.fallbackLabel })

    return (
        <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_88px_72px] items-center gap-x-4">
            <div className="flex min-w-0 items-center gap-2.5">
                <RequestStatusDisplay status={segment.status} showLabel={false} />
                <span className="truncate font-medium text-ds-fg text-sm">{label}</span>
            </div>
            <span className="text-ds-fg text-sm tabular-nums">{formatShare(segment.share)}</span>
            <span className="text-ds-fg text-sm tabular-nums">
                {segment.count.toLocaleString()}
            </span>
        </div>
    )
}

function RequestPipelineSkeleton({ className }: { className?: string }) {
    return (
        <Card
            className={cn(
                "flex flex-col overflow-hidden rounded-lg border-none shadow-dashboard-card",
                className
            )}
        >
            <CardContent className="flex min-h-[344px] flex-1 flex-col p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-10 w-20" />
                <Skeleton className="mt-8 h-4 w-full rounded-full" />
                <div className="mt-4 flex gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton
                            // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static skeleton
                            key={index}
                            className="h-3 w-20"
                        />
                    ))}
                </div>
                <div className="mt-8 flex flex-col gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton
                            // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static skeleton
                            key={index}
                            className="h-6 w-full"
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function formatShare(value: number): string {
    if (value >= 10) return `${Math.round(value)}%`
    return `${value.toFixed(1)}%`
}

function getQueryErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    return fallback
}
