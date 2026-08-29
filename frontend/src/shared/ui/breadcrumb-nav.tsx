import { Link } from "@tanstack/react-router"
import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { isInternalRouteHref } from "@/shared/lib/navigation/internal-route-href"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb"
import { SidebarTrigger, useSidebar } from "@/shared/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

const nonCurrentCrumbClassName = "text-ds-fg-muted"

export interface BreadcrumbNavItem {
    label: string | React.ReactNode
    href?: string
}

interface BreadcrumbNavProps {
    items: BreadcrumbNavItem[]
    actions?: React.ReactNode
}

export function BreadcrumbNav({ items, actions }: BreadcrumbNavProps) {
    const { t } = useTranslation("common")
    const { state } = useSidebar()
    const showDesktopSidebarTrigger = state === "collapsed"

    return (
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center border-b bg-ds-surface">
            <div
                className={`flex h-full min-w-fit items-center justify-center pl-4 ${
                    showDesktopSidebarTrigger ? "md:flex" : "md:hidden"
                }`}
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <SidebarTrigger aria-label={t("action.openNavigation")} />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        {t("action.openNavigation")}
                    </TooltipContent>
                </Tooltip>
            </div>
            <Breadcrumb className="ml-2 md:ml-4">
                <BreadcrumbList>
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1
                        const itemKey = item.href ?? `crumb-${index}`
                        return (
                            <Fragment key={itemKey}>
                                {/* biome-ignore lint/suspicious/noArrayIndexKey: breadcrumb separators have no domain id, position-based key is correct */}
                                {index > 0 && <BreadcrumbSeparator key={`sep-${index}`} />}
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                    ) : item.href && isInternalRouteHref(item.href) ? (
                                        <BreadcrumbLink
                                            asChild
                                            className={nonCurrentCrumbClassName}
                                        >
                                            <Link to={item.href}>{item.label}</Link>
                                        </BreadcrumbLink>
                                    ) : item.href ? (
                                        <BreadcrumbLink
                                            asChild
                                            className={nonCurrentCrumbClassName}
                                        >
                                            <a href={item.href}>{item.label}</a>
                                        </BreadcrumbLink>
                                    ) : (
                                        <span className="px-1.5 py-0.5 font-medium text-ds-fg-muted">
                                            {item.label}
                                        </span>
                                    )}
                                </BreadcrumbItem>
                            </Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>
            {actions && <div className="ml-auto flex items-center gap-2 px-4">{actions}</div>}
        </header>
    )
}
