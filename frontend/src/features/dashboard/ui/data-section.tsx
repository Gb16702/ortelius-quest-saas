import { ArrowUpRight, MoreHorizontal } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

interface DataSectionProps {
    title: string
    rightLabel?: string
    children: ReactNode
    onViewAll?: () => void
    menuItems?: Array<{ label: string; onClick: () => void }>
    className?: string
    contentClassName?: string
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
    contentRef?: React.RefObject<HTMLDivElement>
}

export function DataSection({
    title,
    rightLabel = "COUNT",
    children,
    onViewAll,
    menuItems,
    className,
    contentClassName,
    onScroll,
    contentRef,
}: DataSectionProps) {
    const { t } = useTranslation("dashboard")
    return (
        <Card className={cn("flex flex-col overflow-hidden rounded-md", className)}>
            <CardContent className="flex flex-1 flex-col p-0">
                <div className="border-ds-surface-border border-b bg-ds-surface px-4 py-1">
                    <div className="flex min-h-[60px] items-center justify-between">
                        <h3 className="font-semibold text-ds-fg text-sm">{title}</h3>
                        <span className="font-medium text-ds-fg-muted text-xs uppercase tracking-wide">
                            {rightLabel}
                        </span>
                    </div>
                </div>

                <div
                    ref={contentRef}
                    className={cn("flex min-h-[200px] flex-1 flex-col", contentClassName)}
                    onScroll={onScroll}
                >
                    {children}
                </div>

                {(onViewAll || menuItems) && (
                    <div className="flex items-center justify-center gap-2 border-ds-surface-border border-t bg-ds-surface px-4 py-3">
                        {onViewAll && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onViewAll}
                                className="gap-1.5 text-ds-fg-muted hover:text-ds-fg"
                            >
                                {t("actions.viewAll")}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {menuItems && menuItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">{t("actions.moreOptions")}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {menuItems.map((item, index) => (
                                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                                        <DropdownMenuItem key={index} onClick={item.onClick}>
                                            {item.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface DataSectionItemProps {
    icon?: ReactNode
    label: ReactNode
    value: ReactNode
    onClick?: () => void
    className?: string
}

export function DataSectionItem({ icon, label, value, onClick, className }: DataSectionItemProps) {
    const Component = onClick ? "button" : "div"

    return (
        <Component
            onClick={onClick}
            className={cn(
                "flex items-center justify-between px-4 py-3 transition-colors",
                "hover:bg-ds-surface-hover",
                onClick && "w-full cursor-pointer text-left font-normal",
                className
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                {icon && <div className="flex-shrink-0">{icon}</div>}
                <div className="min-w-0 flex-1 truncate text-ds-fg text-sm">{label}</div>
            </div>
            <div className="ml-4 flex-shrink-0 font-medium text-ds-fg text-sm">{value}</div>
        </Component>
    )
}
