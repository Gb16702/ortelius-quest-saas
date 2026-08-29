import { useNavigate } from "@tanstack/react-router"
import { Bell, ChevronLeft, DoorOpen } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import { redirectToAuthLogoutWithCleanup } from "@/shared/lib/auth/client-logout"
import { HomeIcon } from "@/shared/ui/icons/home-icon"
import { SidebarProvider } from "@/shared/ui/sidebar"
import { getMeMenuItems } from "../lib/me-sidebar-nav.config"
import type { SidebarNotifications } from "../model/sidebar-notifications"
import { MeSidebar } from "./me-sidebar"
import type { SearchableItem } from "./workspace-search"
import { WorkspaceTopbar } from "./workspace-topbar"

interface MeLayoutShellProps {
    sessionData: SessionResponse | null
    activeOrganization: ActiveOrganization | null
    onMarketingHomeNavigate: () => void
    notifications?: SidebarNotifications
    children: ReactNode
}

export function MeLayoutShell({
    sessionData,
    activeOrganization,
    onMarketingHomeNavigate,
    notifications,
    children,
}: MeLayoutShellProps) {
    const navigate = useNavigate()
    const { t } = useTranslation("workspace")
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const hasNotifications = !!notifications
    const hasActiveOrg = !!activeOrganization?.id

    const backToOrgUrl = activeOrganization?.slug
        ? `/org/${activeOrganization.slug}/dashboard`
        : null
    const backToOrgLabel = activeOrganization?.name
        ? t("sidebar.backToOrg", { org: activeOrganization.name })
        : null

    const handleSearchNavigate = useCallback(
        (href: string) => {
            if (href.startsWith("/") && !href.startsWith("//")) {
                void navigate({ href })
                return
            }

            window.location.assign(href)
        },
        [navigate]
    )

    const searchItems = useMemo<SearchableItem[]>(() => {
        const menuItems = getMeMenuItems(hasActiveOrg)
        const pages: SearchableItem[] = menuItems.map((item) => ({
            title: t(item.titleKey),
            subtitle: t("sidebar.subtitlePage"),
            url: item.url,
            icon: item.icon,
        }))

        const items: SearchableItem[] = [
            ...pages,
            ...(hasNotifications
                ? [
                      {
                          title: t("sidebar.openNotifications"),
                          subtitle: t("sidebar.subtitleAction"),
                          icon: Bell,
                          onAction: () => setNotificationsOpen(true),
                      },
                  ]
                : []),
            {
                title: t("sidebar.homePage"),
                subtitle: t("sidebar.subtitlePage"),
                icon: HomeIcon,
                onAction: onMarketingHomeNavigate,
            },
            {
                title: t("sidebar.signOut"),
                subtitle: t("sidebar.subtitleAction"),
                icon: DoorOpen,
                onAction: redirectToAuthLogoutWithCleanup,
            },
        ]

        if (backToOrgUrl && backToOrgLabel) {
            items.unshift({
                title: backToOrgLabel,
                subtitle: t("sidebar.subtitleNavigation"),
                icon: ChevronLeft,
                url: backToOrgUrl,
            })
        }

        return items
    }, [hasActiveOrg, hasNotifications, backToOrgUrl, backToOrgLabel, onMarketingHomeNavigate, t])

    return (
        <div className="flex h-dvh overflow-hidden bg-ds-sidebar-canvas">
            <SidebarProvider className="flex h-full overflow-hidden">
                <MeSidebar sessionData={sessionData} activeOrganization={activeOrganization} />
                <div className="flex min-w-0 flex-1 flex-col bg-ds-sidebar-canvas md:m-2 md:mt-0 md:ml-0 md:peer-data-[state=collapsed]:ml-2">
                    <WorkspaceTopbar
                        sessionData={sessionData}
                        onMarketingHomeNavigate={onMarketingHomeNavigate}
                        notificationBasePath="/me"
                        notificationsOpen={notificationsOpen}
                        onNotificationsOpenChange={setNotificationsOpen}
                        notifications={notifications}
                        assistantOrganizationId={activeOrganization?.id}
                        searchItems={searchItems}
                        onSearchNavigate={handleSearchNavigate}
                    />
                    <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ds-surface-border bg-ds-surface">
                        <div className="min-h-0 flex-1 overflow-y-auto bg-ds-canvas">
                            {children}
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        </div>
    )
}
