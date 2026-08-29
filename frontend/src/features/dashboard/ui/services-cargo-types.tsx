import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/shared/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { ToastPill } from "@/shared/ui/toast-pill"
import type { TimePeriod } from "../model/dashboard"
import { useRequestsAggregation } from "../model/hooks/use-dashboard-data"
import type { OrganizationRequestsAggregation } from "../model/schemas/dashboard.schema"
import { DataSectionSkeleton } from "./data-section-skeleton"

interface ServicesCargoTypesProps {
    organizationSlug: string
    period?: TimePeriod
    className?: string
}

const chartConfig = {
    count: {
        label: "Requests",
        color: "var(--color-ds-accent-700)",
    },
} satisfies ChartConfig

export function ServicesCargoTypes({
    organizationSlug,
    period = 30,
    className,
}: ServicesCargoTypesProps) {
    const { t } = useTranslation("dashboard")
    const { data, error, isError, isLoading, refetch } = useRequestsAggregation(
        organizationSlug,
        period
    )
    const servicesRef = useRef<HTMLDivElement>(null)
    const cargoRef = useRef<HTMLDivElement>(null)
    const [activeTab, setActiveTab] = useState("cargo")
    const [showServicesGradient, setShowServicesGradient] = useState(true)
    const [showCargoGradient, setShowCargoGradient] = useState(true)

    const evaluateScrollGradientVisibility = useCallback(
        (element: HTMLDivElement | null, setShowGradient: (show: boolean) => void) => {
            if (!element) return
            const isAtBottom =
                Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) <= 10
            const isScrollable = element.scrollHeight > element.clientHeight
            setShowGradient(isScrollable && !isAtBottom)
        },
        []
    )

    const updateScrollGradientVisibility = (
        e: React.UIEvent<HTMLDivElement>,
        setShowGradient: (show: boolean) => void
    ) => {
        evaluateScrollGradientVisibility(e.currentTarget, setShowGradient)
    }

    useEffect(() => {
        evaluateScrollGradientVisibility(servicesRef.current, setShowServicesGradient)
        evaluateScrollGradientVisibility(cargoRef.current, setShowCargoGradient)
    }, [evaluateScrollGradientVisibility])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === "services") {
                evaluateScrollGradientVisibility(servicesRef.current, setShowServicesGradient)
            } else {
                evaluateScrollGradientVisibility(cargoRef.current, setShowCargoGradient)
            }
        }, 50)
        return () => clearTimeout(timer)
    }, [activeTab, evaluateScrollGradientVisibility])

    if (isLoading) {
        return <DataSectionSkeleton rows={5} showTabs className={className} />
    }

    if (isError) {
        return (
            <Card
                className={cn(
                    "overflow-hidden rounded-lg border-none shadow-dashboard-card",
                    className
                )}
            >
                <CardContent className="flex min-h-[200px] items-center justify-center p-6">
                    <ToastPill
                        variant="error"
                        message={getQueryErrorMessage(error, t("servicesCargo.error"))}
                        action={{
                            label: t("common.retry"),
                            onClick: () => {
                                void refetch()
                            },
                        }}
                        onDismiss={() => undefined}
                    />
                </CardContent>
            </Card>
        )
    }

    const services = data?.services || []
    const cargoTypes = data?.cargoTypes || []

    return (
        <Card
            className={cn(
                "overflow-hidden rounded-lg border-none shadow-dashboard-card",
                className
            )}
        >
            <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="border-ds-surface-border border-b bg-ds-surface px-4 py-1">
                        <div className="flex min-h-[60px] items-center justify-between">
                            <TabsList className="gap-x-2 border-none p-0">
                                <TabsTrigger className="h-9 px-2" value="cargo">
                                    {t("servicesCargo.tabs.cargo")}
                                </TabsTrigger>
                                <TabsTrigger className="h-9 px-2" value="services">
                                    {t("servicesCargo.tabs.services")}
                                </TabsTrigger>
                            </TabsList>
                            <span className="font-medium text-ds-fg-muted text-xs uppercase tracking-wide">
                                {t("servicesCargo.rightLabel")}
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <TabsContent
                            ref={servicesRef}
                            value="services"
                            className="m-0 flex max-h-[320px] min-h-[260px] flex-col overflow-y-auto pb-3"
                            onScroll={(e) =>
                                updateScrollGradientVisibility(e, setShowServicesGradient)
                            }
                        >
                            {services.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center text-ds-fg-muted text-sm">
                                    {t("servicesCargo.emptyServices")}
                                </div>
                            ) : (
                                <SegmentBreakdownChart data={services} />
                            )}
                        </TabsContent>

                        <TabsContent
                            ref={cargoRef}
                            value="cargo"
                            className="m-0 flex max-h-[320px] min-h-[260px] flex-col overflow-y-auto pb-3"
                            onScroll={(e) =>
                                updateScrollGradientVisibility(e, setShowCargoGradient)
                            }
                        >
                            {cargoTypes.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center text-ds-fg-muted text-sm">
                                    {t("servicesCargo.emptyCargo")}
                                </div>
                            ) : (
                                <SegmentBreakdownChart data={cargoTypes} />
                            )}
                        </TabsContent>

                        {activeTab === "services" &&
                            services.length > 5 &&
                            showServicesGradient && (
                                <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-ds-surface to-transparent" />
                            )}
                        {activeTab === "cargo" && cargoTypes.length > 5 && showCargoGradient && (
                            <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-ds-surface to-transparent" />
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    )
}

function getQueryErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    return fallback
}

type AggregationItem = OrganizationRequestsAggregation["services"][number]

interface SegmentBreakdownChartProps {
    data: AggregationItem[]
}

function SegmentBreakdownChart({ data }: SegmentBreakdownChartProps) {
    const chartData = data.slice(0, 6).map((item) => ({
        ...item,
        label: truncateChartLabel(item.name),
        displayValue: `${item.count.toLocaleString()} · ${item.percentage}%`,
    }))

    return (
        <ChartContainer config={chartConfig} className="h-[260px] w-full px-4 pt-4 pb-1">
            <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 72, bottom: 8, left: 0 }}
            >
                <CartesianGrid horizontal={false} className="stroke-ds-surface-border" />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="label"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={150}
                    tickMargin={8}
                    className="text-xs"
                />
                <ChartTooltip
                    cursor={{ fill: "var(--color-ds-surface-hover)" }}
                    content={
                        <ChartTooltipContent
                            nameKey="count"
                            labelKey="name"
                            formatter={(value, _name, item) => {
                                const percentage = getTooltipPayloadPercentage(item.payload)
                                return `${Number(value).toLocaleString()} · ${percentage}%`
                            }}
                        />
                    }
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList
                        dataKey="displayValue"
                        position="right"
                        offset={8}
                        className="fill-ds-fg-muted text-xs"
                    />
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}

function truncateChartLabel(label: string): string {
    if (label.length <= 24) return label
    return `${label.slice(0, 21)}...`
}

function getTooltipPayloadPercentage(payload: unknown): number {
    if (typeof payload !== "object" || payload === null || !("percentage" in payload)) {
        return 0
    }

    return typeof payload.percentage === "number" ? payload.percentage : 0
}
