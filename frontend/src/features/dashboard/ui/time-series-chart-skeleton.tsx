import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"

const CHART_SKELETON_BAR_HEIGHTS = [45, 56, 63, 69, 37, 40, 62, 36, 21, 34, 54, 78, 28, 64, 77]

interface TimeSeriesChartSkeletonProps {
    className?: string
    height?: string
}

export function TimeSeriesChartSkeleton({
    className,
    height = "h-[350px]",
}: TimeSeriesChartSkeletonProps) {
    return (
        <Card className={cn("rounded-lg border-none shadow-dashboard-card", className)}>
            <CardContent className="p-8 pb-6 pl-0">
                <div className={cn("flex w-full items-end gap-2", height)}>
                    {CHART_SKELETON_BAR_HEIGHTS.map((barHeight, i) => {
                        return (
                            <div
                                // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                                key={i}
                                className="flex-1 animate-pulse rounded-t bg-ds-canvas"
                                style={{
                                    height: `${barHeight}%`,
                                    animationDelay: `${i * 50}ms`,
                                }}
                            />
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
