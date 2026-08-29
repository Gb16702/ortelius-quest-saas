import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"

interface ActivityScoreCardProps {
    title: string
    score?: number
    trend?: {
        value: number
        isPositive: boolean
    }
    periodLabel: string
    isLoading?: boolean
    className?: string
}

export function ActivityScoreCard({
    title,
    score = 0,
    trend,
    periodLabel,
    isLoading = false,
    className,
}: ActivityScoreCardProps) {
    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)))
    const trendPrefix = trend?.isPositive ? "+" : "-"

    return (
        <Card className={cn("h-full border-none bg-ds-canvas", className)}>
            <CardContent className="flex h-full min-h-[332px] flex-col p-5">
                <p className="font-medium text-ds-fg-muted text-sm">{title}</p>

                {isLoading ? (
                    <ActivityScoreSkeleton />
                ) : (
                    <>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            {trend && (
                                <span
                                    className={cn(
                                        "font-medium text-sm tabular-nums",
                                        trend.isPositive ? "text-green-600" : "text-red-600"
                                    )}
                                >
                                    {trendPrefix}
                                    {Math.abs(Math.ceil(trend.value))}%
                                </span>
                            )}
                            <span className="font-mono text-ds-fg-muted text-xs">
                                {periodLabel.toLocaleLowerCase()}
                            </span>
                        </div>

                        <div className="relative mt-8 flex min-h-[205px] items-end justify-center overflow-hidden">
                            <SegmentedScoreGauge score={normalizedScore} />
                            <div className="absolute bottom-10 flex items-baseline justify-center gap-1">
                                <span className="font-medium text-[32px] text-ds-fg leading-none">
                                    {normalizedScore}
                                </span>
                                <span className="text-ds-fg-muted text-sm">/100</span>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

interface SegmentedScoreGaugeProps {
    score: number
}

function SegmentedScoreGauge({ score }: SegmentedScoreGaugeProps) {
    const segmentCount = 32
    const activeSegments = Math.round((score / 100) * segmentCount)
    const centerX = 180
    const centerY = 184
    const innerRadius = 122
    const outerRadius = 148
    const segments = Array.from({ length: segmentCount }, (_, index) => {
        const angle = 180 - (index / (segmentCount - 1)) * 180
        const radians = (angle * Math.PI) / 180
        const x1 = centerX + Math.cos(radians) * innerRadius
        const y1 = centerY - Math.sin(radians) * innerRadius
        const x2 = centerX + Math.cos(radians) * outerRadius
        const y2 = centerY - Math.sin(radians) * outerRadius

        return {
            id: index,
            isActive: index < activeSegments,
            x1,
            y1,
            x2,
            y2,
        }
    })

    return (
        <svg
            aria-hidden="true"
            className="h-[190px] w-full max-w-[360px]"
            role="img"
            viewBox="0 0 360 210"
        >
            {segments.map((segment) => (
                <line
                    key={segment.id}
                    className={
                        segment.isActive ? "stroke-ds-accent-700" : "stroke-ds-control-border"
                    }
                    strokeLinecap="round"
                    strokeWidth="4"
                    x1={segment.x1}
                    x2={segment.x2}
                    y1={segment.y1}
                    y2={segment.y2}
                />
            ))}
        </svg>
    )
}

function ActivityScoreSkeleton() {
    return (
        <div className="mt-5 flex flex-1 flex-col justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-ds-surface-hover" />
            <div className="mx-auto mb-7 h-28 w-64 animate-pulse rounded-t-full bg-ds-surface-hover" />
        </div>
    )
}
