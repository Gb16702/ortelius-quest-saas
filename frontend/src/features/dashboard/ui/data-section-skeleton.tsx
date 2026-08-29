import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { Card, CardContent } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs"

interface DataSectionSkeletonProps {
    rows?: number
    showTabs?: boolean
    title?: string
    rightLabel?: string
    className?: string
}

export function DataSectionSkeleton({
    rows = 5,
    showTabs = false,
    title,
    rightLabel,
    className,
}: DataSectionSkeletonProps) {
    const { t } = useTranslation("dashboard")
    return (
        <Card className={cn("overflow-hidden rounded-sm", className)}>
            <CardContent className="p-0">
                {showTabs ? (
                    <Tabs defaultValue="cargo">
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
                    </Tabs>
                ) : title && rightLabel ? (
                    <div className="border-ds-surface-border border-b bg-ds-surface px-4 py-1">
                        <div className="flex min-h-[60px] items-center justify-between">
                            <h3 className="font-semibold text-ds-fg text-sm">{title}</h3>
                            <span className="font-medium text-ds-fg-muted text-xs uppercase tracking-wide">
                                {rightLabel}
                            </span>
                        </div>
                    </div>
                ) : null}

                <div className="min-h-[200px]">
                    {Array.from({ length: rows }).map((_, index) => (
                        <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                            key={index}
                            className="flex items-center justify-between px-4 py-3 last:border-b-0"
                        >
                            <div className="flex flex-1 items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton
                                        className="h-4 w-full max-w-xs"
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                        }}
                                    />
                                </div>
                            </div>
                            <Skeleton
                                className="h-4 w-12"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
