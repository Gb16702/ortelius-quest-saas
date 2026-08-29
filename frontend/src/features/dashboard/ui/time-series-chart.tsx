import { addDays, addMonths, differenceInCalendarDays, format, startOfDay, subDays } from "date-fns"
import type { TooltipPayload } from "recharts"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    XAxis,
    YAxis,
} from "recharts"
import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/shared/ui/chart"
import type { DashboardChartGranularity } from "../lib/dashboard-metric-buckets"

interface TimeSeriesDataPoint {
    date: string
    [key: string]: unknown
}

interface TimeSeriesChartProps {
    data: ReadonlyArray<TimeSeriesDataPoint>
    dataKeys: Array<{
        key: string
        label: string
        color: string
    }>
    className?: string
    valueFormatter?: (value: number) => string
    period?: number
    title?: string
    value?: string | number
    trend?: {
        value: number
        isPositive: boolean
    }
    trendLabel?: string
    hideYAxis?: boolean
    chartType?: "area" | "bar" | "line"
    chartClassName?: string
    granularity?: DashboardChartGranularity
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayload
    label?: string | number
    valueFormatter?: (value: number) => string
    chartConfig: ChartConfig
    formattedData: Array<TimeSeriesDataPoint & { formattedDate: string }>
}

interface XAxisTickProps {
    x?: number | string
    y?: number | string
    payload?: {
        value?: string | number
    }
}

const xAxisPadding = { left: 16, right: 16 }

function formatXAxisLabel(
    value: string | number,
    period: number,
    granularity: DashboardChartGranularity
): string {
    const timestamp = typeof value === "number" ? value : parseInt(value, 10)
    if (Number.isNaN(timestamp)) {
        return String(value)
    }

    const date = new Date(timestamp)

    if (granularity === "month" || period === 365) {
        return format(date, "MMM")
    }
    if (granularity === "week" || period === 90) {
        return format(date, "MMM d")
    }
    return format(date, "d")
}

function formatDateKey(value: string | number): string | null {
    const timestamp = typeof value === "number" ? value : parseInt(value, 10)
    if (Number.isNaN(timestamp)) {
        return null
    }
    return format(new Date(timestamp), "yyyy-MM-dd")
}

function createDenseTimeSeriesData(
    data: ReadonlyArray<TimeSeriesDataPoint>,
    dataKeys: TimeSeriesChartProps["dataKeys"],
    period: number,
    granularity: DashboardChartGranularity
): Array<TimeSeriesDataPoint & { formattedDate: string }> {
    const sortedData = [...data].sort((a, b) => Number(a.date) - Number(b.date))

    if (sortedData.length === 0) {
        return []
    }

    if (granularity !== "day") {
        return sortedData.map((item) => ({
            ...item,
            formattedDate: formatXAxisLabel(item.date, period, granularity),
        }))
    }

    const lastTimestamp = Number(sortedData.at(-1)?.date)

    if (Number.isNaN(lastTimestamp)) {
        return sortedData.map((item) => ({
            ...item,
            formattedDate: formatXAxisLabel(item.date, period, granularity),
        }))
    }

    const byDate = new Map<string, TimeSeriesDataPoint>()
    for (const item of sortedData) {
        const dateKey = formatDateKey(item.date)
        if (dateKey) {
            byDate.set(dateKey, item)
        }
    }

    const today = startOfDay(new Date())
    const latestDataDate = startOfDay(new Date(lastTimestamp))
    const endDate = latestDataDate > today ? latestDataDate : today
    const startDate = subDays(endDate, Math.max(period - 1, 0))
    const dayCount = differenceInCalendarDays(endDate, startDate)

    return Array.from({ length: dayCount + 1 }, (_, offset) => {
        const date = addDays(startDate, offset)
        const dateKey = format(date, "yyyy-MM-dd")
        const source = byDate.get(dateKey)
        const dateValue = source?.date ?? String(date.getTime())
        const point: TimeSeriesDataPoint = {
            ...(source ?? { date: dateValue }),
            date: dateValue,
        }

        for (const { key } of dataKeys) {
            if (typeof point[key] !== "number") {
                point[key] = 0
            }
        }

        return {
            ...point,
            formattedDate: formatXAxisLabel(dateValue, period, granularity),
        }
    })
}

function singularize(word: string): string {
    if (word.endsWith("s")) {
        return word.slice(0, -1)
    }
    return word
}

function CustomTooltip({
    active,
    payload,
    label,
    valueFormatter = (value) => value.toLocaleString(),
    chartConfig,
    formattedData,
}: CustomTooltipProps) {
    if (!active || !payload || !payload.length) {
        return null
    }

    const labelValue = String(label)
    const item = formattedData.find((d) => d.date === labelValue || d.formattedDate === labelValue)
    const timestamp = item ? parseInt(item.date, 10) : parseInt(labelValue, 10)

    const tooltipLabel = item?.tooltipLabel
    let fullDate = typeof tooltipLabel === "string" ? tooltipLabel : label
    if (!Number.isNaN(timestamp)) {
        const date = new Date(timestamp)
        const isCurrentYear = date.getFullYear() === new Date().getFullYear()
        fullDate =
            typeof tooltipLabel === "string"
                ? tooltipLabel
                : date.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      ...(isCurrentYear ? {} : { year: "numeric" }),
                  })
    }

    return (
        <div className="rounded-sm bg-ds-surface p-3 shadow-dropdown">
            {payload.map((entry) => {
                const dataKey = String(entry.dataKey)
                const config = chartConfig[dataKey]
                const value = Number(entry.value ?? 0)
                const label = typeof config?.label === "string" ? config.label : dataKey
                const displayLabel = value <= 1 ? singularize(label) : label
                return (
                    <div key={dataKey} className="mb-2 flex items-center">
                        <div
                            className="mr-2 h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-ds-fg text-sm">
                            <span className="font-medium">{valueFormatter(value)}</span>{" "}
                            {displayLabel}
                        </span>
                    </div>
                )
            })}
            <p className="text-ds-fg-muted text-xs">{fullDate}</p>
        </div>
    )
}

function getXAxisTickStep(period: number): number {
    if (period === 7) return 1
    if (period === 14) return 2
    if (period === 30) return 4
    if (period === 90) return 14
    if (period === 365) return 31
    return 1
}

function getXAxisTicks(
    data: ReadonlyArray<TimeSeriesDataPoint>,
    period: number,
    granularity: DashboardChartGranularity
): string[] {
    if (data.length === 0) {
        return []
    }

    if (granularity === "month") {
        return data
            .map((item) => item.date)
            .filter((date): date is string => typeof date === "string")
    }

    if (granularity === "week") {
        return data
            .map((item, index) => ({ date: item.date, index }))
            .filter(({ index }) => index % 2 === 0)
            .map(({ date }) => date)
            .filter((date): date is string => typeof date === "string")
    }

    if (period === 365) {
        const firstTimestamp = Number(data[0]?.date)
        const lastTimestamp = Number(data.at(-1)?.date)

        if (Number.isNaN(firstTimestamp) || Number.isNaN(lastTimestamp)) {
            return []
        }

        const ticks: string[] = []
        const startDate = new Date(firstTimestamp)
        const endDate = new Date(lastTimestamp)

        for (let tickDate = startDate; tickDate <= endDate; tickDate = addMonths(tickDate, 1)) {
            const dateKey = format(tickDate, "yyyy-MM-dd")
            const item = data.find((point) => formatDateKey(point.date) === dateKey)
            if (typeof item?.date === "string") {
                ticks.push(item.date)
            }
        }

        return ticks
    }

    const step = getXAxisTickStep(period)
    return data
        .map((item, index) => ({ date: item.date, index }))
        .filter(({ index }) => index % step === 0)
        .map(({ date }) => date)
        .filter((date): date is string => typeof date === "string")
}

function renderXAxisTick({
    x,
    y,
    payload,
    period,
    granularity,
}: XAxisTickProps & { period: number; granularity: DashboardChartGranularity }) {
    if (x === undefined || y === undefined || payload?.value === undefined) {
        return null
    }

    return (
        <text x={x} y={y} dy={8} textAnchor="middle" className="fill-ds-fg-muted text-xs">
            {formatXAxisLabel(payload.value, period, granularity)}
        </text>
    )
}

function hasPositiveChartValue(
    data: ReadonlyArray<TimeSeriesDataPoint>,
    dataKeys: TimeSeriesChartProps["dataKeys"]
): boolean {
    return data.some((item) =>
        dataKeys.some(({ key }) => {
            const value = item[key]
            return typeof value === "number" && value > 0
        })
    )
}

export function TimeSeriesChart({
    data,
    dataKeys,
    className,
    valueFormatter = (value) => value.toLocaleString(),
    period = 30,
    title,
    value,
    trend,
    trendLabel,
    hideYAxis = false,
    chartType = "area",
    chartClassName,
    granularity = "day",
}: TimeSeriesChartProps) {
    const chartConfig: ChartConfig = Object.fromEntries(
        dataKeys.map(({ key, label, color }) => [key, { label, color }])
    )

    const formattedData = createDenseTimeSeriesData(data, dataKeys, period, granularity)

    const formattedValue = typeof value === "number" ? valueFormatter(value) : value
    const trendPrefix = trend?.isPositive ? "+" : "-"
    const xAxisTicks = getXAxisTicks(formattedData, period, granularity)
    const xAxisTick = (props: XAxisTickProps) => renderXAxisTick({ ...props, period, granularity })
    const primarySeriesColor = dataKeys[0]?.color ?? "var(--color-ds-accent-700)"
    const shouldShowZeroBarBaseline =
        chartType === "bar" && !hasPositiveChartValue(formattedData, dataKeys)

    return (
        <Card className={cn("rounded-lg border-none shadow-dashboard-card", className)}>
            <CardContent className="p-5">
                {(title || formattedValue) && (
                    <div className="mb-6 flex flex-col gap-3">
                        {title && <p className="font-medium text-ds-fg-muted text-sm">{title}</p>}
                        {formattedValue && (
                            <div className="flex flex-col gap-2">
                                <p className="font-medium text-[28px] text-ds-fg leading-none">
                                    {formattedValue}
                                </p>
                                {(trend || trendLabel) && (
                                    <div className="flex flex-wrap items-baseline gap-1.5">
                                        {trend && (
                                            <span
                                                className={cn(
                                                    "font-medium text-sm tabular-nums",
                                                    trend.isPositive
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                )}
                                            >
                                                {trendPrefix}
                                                {Math.abs(Math.ceil(trend.value))}%
                                            </span>
                                        )}
                                        {trendLabel && (
                                            <span className="font-mono text-ds-fg-muted text-xs">
                                                {trendLabel}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <ChartContainer
                    config={chartConfig}
                    className={cn("h-[320px] w-full", chartClassName)}
                >
                    {chartType === "bar" ? (
                        <BarChart
                            data={formattedData}
                            margin={{ top: 4, right: 8, left: hideYAxis ? 8 : 0, bottom: 0 }}
                        >
                            <CartesianGrid horizontal={false} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                padding={xAxisPadding}
                                tickMargin={10}
                                height={34}
                                className="text-xs"
                                interval={0}
                                ticks={xAxisTicks}
                                tick={xAxisTick}
                            />
                            <YAxis
                                hide={hideYAxis}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                                tickFormatter={valueFormatter}
                                className="text-xs"
                            />
                            <ChartTooltip
                                cursor={false}
                                content={({ active, payload, label }) => (
                                    <CustomTooltip
                                        active={active}
                                        payload={payload}
                                        label={label}
                                        valueFormatter={valueFormatter}
                                        chartConfig={chartConfig}
                                        formattedData={formattedData}
                                    />
                                )}
                            />
                            {shouldShowZeroBarBaseline && (
                                <ReferenceLine
                                    y={0}
                                    stroke={primarySeriesColor}
                                    strokeWidth={1.5}
                                />
                            )}
                            {dataKeys.map(({ key, color }) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={color}
                                    radius={[999, 999, 999, 999]}
                                    barSize={16}
                                    isAnimationActive={true}
                                    animationDuration={400}
                                    animationBegin={0}
                                    animationEasing="ease-out"
                                />
                            ))}
                        </BarChart>
                    ) : chartType === "line" ? (
                        <LineChart
                            data={formattedData}
                            margin={{ top: 4, right: 8, left: hideYAxis ? 8 : 0, bottom: 0 }}
                        >
                            <CartesianGrid horizontal={false} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                padding={xAxisPadding}
                                tickMargin={10}
                                height={34}
                                className="text-xs"
                                interval={0}
                                ticks={xAxisTicks}
                                tick={xAxisTick}
                            />
                            <YAxis
                                hide={hideYAxis}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                                tickFormatter={valueFormatter}
                                className="text-xs"
                            />
                            <ChartTooltip
                                cursor={{
                                    stroke: "var(--color-ds-surface-border)",
                                    strokeWidth: 1,
                                }}
                                content={({ active, payload, label }) => (
                                    <CustomTooltip
                                        active={active}
                                        payload={payload}
                                        label={label}
                                        valueFormatter={valueFormatter}
                                        chartConfig={chartConfig}
                                        formattedData={formattedData}
                                    />
                                )}
                            />
                            {dataKeys.map(({ key, color }) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={color}
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={true}
                                    animationDuration={700}
                                    animationBegin={0}
                                    animationEasing="ease-out"
                                    activeDot={{
                                        r: 4,
                                    }}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <AreaChart
                            data={formattedData}
                            margin={{ top: 4, right: 8, left: hideYAxis ? 8 : 0, bottom: 0 }}
                        >
                            <defs>
                                {dataKeys.map(({ key, color }) => (
                                    <linearGradient
                                        key={key}
                                        id={`gradient-${key}`}
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop offset="40%" stopColor={color} stopOpacity={0.8} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid horizontal={false} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                padding={xAxisPadding}
                                tickMargin={10}
                                height={34}
                                className="text-xs"
                                interval={0}
                                ticks={xAxisTicks}
                                tick={xAxisTick}
                            />
                            <YAxis
                                hide={hideYAxis}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                                tickFormatter={valueFormatter}
                                className="text-xs"
                            />
                            <ChartTooltip
                                cursor={{
                                    stroke: "var(--color-ds-accent-700)",
                                    strokeWidth: 1,
                                    strokeDasharray: "6",
                                }}
                                content={({ active, payload, label }) => (
                                    <CustomTooltip
                                        active={active}
                                        payload={payload}
                                        label={label}
                                        valueFormatter={valueFormatter}
                                        chartConfig={chartConfig}
                                        formattedData={formattedData}
                                    />
                                )}
                            />
                            {dataKeys.map(({ key, color }) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={color}
                                    strokeWidth={1.5}
                                    strokeOpacity={1}
                                    fill={`url(#gradient-${key})`}
                                    fillOpacity={0.14}
                                    isAnimationActive={true}
                                    animationDuration={700}
                                    animationBegin={0}
                                    animationEasing="ease-out"
                                    activeDot={{
                                        r: 4,
                                    }}
                                />
                            ))}
                        </AreaChart>
                    )}
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
