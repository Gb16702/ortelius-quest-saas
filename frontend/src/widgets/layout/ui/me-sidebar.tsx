import { Link, useLocation } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shared/ui/sidebar"
import { getMeMenuItems, isMeUrlActive } from "../lib/me-sidebar-nav.config"

interface MeSidebarProps {
    sessionData: SessionResponse | null
    activeOrganization: ActiveOrganization | null
}

export function MeSidebar({ activeOrganization }: MeSidebarProps) {
    const { t } = useTranslation("workspace")
    const pathname = useLocation({ select: (location) => location.pathname })

    const hasActiveOrg = !!activeOrganization?.id
    const menuItems = getMeMenuItems(hasActiveOrg)

    const backToOrgUrl = activeOrganization?.slug
        ? `/org/${activeOrganization.slug}/dashboard`
        : null
    const backToOrgLabel = activeOrganization?.name
        ? t("sidebar.backToOrg", { org: activeOrganization.name })
        : null

    return (
        <Sidebar collapsible="offcanvas" className="bg-ds-canvas">
            {backToOrgUrl && backToOrgLabel && (
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="relative">
                                    <Link to={backToOrgUrl}>
                                        <ChevronLeft className="absolute left-2 h-4 w-4" />
                                        <span className="w-full text-center font-medium">
                                            {backToOrgLabel}
                                        </span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            )}
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => {
                                const Icon = item.icon
                                const itemUrl = item.url
                                const isActive = isMeUrlActive(itemUrl, pathname)
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <Link to={itemUrl}>
                                                <Icon />
                                                <span>{t(item.titleKey)}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
