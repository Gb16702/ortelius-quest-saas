import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"

interface MetricStatCardProps {
    title: string
    value: string | number
    trend?: {
        value: number
        isPositive: boolean
    }
    subtitle?: string
    className?: string
    valueFormatter?: (value: string | number) => string
    comparisonLabel?: string
    periodLabel?: string
}

export function MetricStatCard({
    title,
    value,
    trend,
    subtitle,
    className,
    valueFormatter,
    comparisonLabel,
    periodLabel,
}: MetricStatCardProps) {
    const formattedValue = valueFormatter
        ? valueFormatter(value)
        : typeof value === "number"
          ? value.toLocaleString()
          : value
    const formattedPeriodLabel = periodLabel ?? comparisonLabel
    const trendPrefix = trend?.isPositive ? "+" : "-"

    return (
        <Card
            className={cn(
                "h-full overflow-hidden rounded-none border-none bg-ds-canvas",
                className
            )}
        >
            <CardContent className="flex min-h-[148px] flex-col p-4">
                <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-ds-fg-muted text-sm">{title}</p>
                </div>
                <div className="mt-2">
                    <h3 className="font-medium text-[28px] text-ds-fg">{formattedValue}</h3>
                    {subtitle && <p className="text-ds-fg-muted text-sm">{subtitle}</p>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-4 text-sm">
                    <span className="truncate font-mono text-ds-fg-muted text-xs">
                        {formattedPeriodLabel?.toLocaleLowerCase()}
                    </span>
                    {trend && (
                        <span
                            className={cn(
                                "flex shrink-0 items-center gap-1 font-medium tabular-nums",
                                trend.isPositive ? "text-green-600" : "text-red-600"
                            )}
                        >
                            {trendPrefix}
                            {Math.abs(Math.ceil(trend.value))}%
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
