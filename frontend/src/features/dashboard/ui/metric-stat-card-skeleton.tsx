import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"

interface MetricStatCardSkeletonProps {
    className?: string
}

export function MetricStatCardSkeleton({ className }: MetricStatCardSkeletonProps) {
    return (
        <Card
            className={cn(
                "h-full overflow-hidden rounded-none border-none bg-ds-canvas",
                className
            )}
        >
            <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-ds-canvas" />
                    <div className="h-5 w-12 animate-pulse rounded bg-ds-canvas" />
                </div>
                <div>
                    <div className="mb-2 h-9 w-20 animate-pulse rounded bg-ds-canvas" />
                </div>
            </CardContent>
        </Card>
    )
}
