import { useNavigate } from "@tanstack/react-router"
import { Bell, DoorOpen, Settings } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Role } from "@/entities/access"
import type { OrganizationBrandColor, OrganizationFontId } from "@/entities/organization"
import { useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { redirectToAuthLogoutWithCleanup } from "@/shared/lib/auth/client-logout"
import { HomeIcon } from "@/shared/ui/icons/home-icon"
import { SidebarProvider } from "@/shared/ui/sidebar"
import { InviteMembersIcon, ShareCompanyPageIcon } from "@/shared/ui/sidebar-icons"
import { getFilteredOrgSubItems, orgMainMenuItems } from "../lib/org-sidebar-nav.config"
import type { SidebarNotifications } from "../model/sidebar-notifications"
import { useOrgRouteNavigationMetrics } from "../model/use-org-route-navigation-metrics"
import { OrgSidebar } from "./org-sidebar"
import type { SearchableItem } from "./workspace-search"
import { WorkspaceTopbar } from "./workspace-topbar"

export interface OrgLayoutShellData {
    org: {
        id: string
        name: string
        slug: string
        logo: string | null
        brandColor: OrganizationBrandColor
        font: OrganizationFontId
        memberCount?: number | null
    }
    role: Role
    slug: string
}

interface OrgLayoutShellProps {
    sessionData: SessionResponse | null
    slug: string
    onMarketingHomeNavigate: () => void
    onShareCompanyPage: () => void
    onShareCompanyPageIntent?: () => void
    onInviteMembers?: () => void
    onInviteMembersIntent?: () => void
    onViewUserProfile?: (userId: string) => void
    onViewUserProfileIntent?: () => void
    onRouteDataIntent?: (to: string) => void
    notifications?: SidebarNotifications
    children: ReactNode
}

export function OrgLayoutShell({
    sessionData,
    slug,
    onMarketingHomeNavigate,
    onShareCompanyPage,
    onShareCompanyPageIntent,
    onInviteMembers,
    onInviteMembersIntent,
    onViewUserProfile,
    onViewUserProfileIntent,
    onRouteDataIntent,
    notifications,
    children,
}: OrgLayoutShellProps) {
    useOrgRouteNavigationMetrics()
    const { state } = useOrg()
    const navigate = useNavigate()
    const { t } = useTranslation("workspace")
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const isAdmin = state.isAdmin

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
        const pageSubtitle = t("sidebar.subtitlePage")
        const actionSubtitle = t("sidebar.subtitleAction")
        const filteredItems = orgMainMenuItems.filter((item) => !item.requiresAdmin || isAdmin)
        const pages: SearchableItem[] = filteredItems.flatMap((item) => {
            const subs = getFilteredOrgSubItems(item, isAdmin)
            if (subs.length === 0) {
                return [
                    {
                        title: t(item.titleKey),
                        subtitle: pageSubtitle,
                        url: item.buildUrl(slug),
                        icon: item.icon,
                    },
                ]
            }
            return subs.map((sub) => ({
                title: t(sub.titleKey),
                subtitle: pageSubtitle,
                url: sub.buildUrl(slug),
                icon: sub.icon,
            }))
        })

        return [
            ...pages,
            {
                title: t("sidebar.shareCompanyPage"),
                subtitle: actionSubtitle,
                icon: ShareCompanyPageIcon,
                onAction: onShareCompanyPage,
                onIntent: onShareCompanyPageIntent,
            },
            ...(isAdmin && onInviteMembers
                ? [
                      {
                          title: t("sidebar.inviteMembers"),
                          subtitle: actionSubtitle,
                          icon: InviteMembersIcon,
                          onAction: onInviteMembers,
                          onIntent: onInviteMembersIntent,
                      },
                  ]
                : []),
            ...(notifications
                ? [
                      {
                          title: t("sidebar.openNotifications"),
                          subtitle: actionSubtitle,
                          icon: Bell,
                          onAction: () => setNotificationsOpen(true),
                      },
                  ]
                : []),
            {
                title: t("sidebar.accountSettings"),
                subtitle: pageSubtitle,
                icon: Settings,
                url: "/me/account",
            },
            {
                title: t("sidebar.homePage"),
                subtitle: pageSubtitle,
                icon: HomeIcon,
                onAction: onMarketingHomeNavigate,
            },
            {
                title: t("sidebar.signOut"),
                subtitle: actionSubtitle,
                icon: DoorOpen,
                onAction: redirectToAuthLogoutWithCleanup,
            },
        ]
    }, [
        isAdmin,
        slug,
        onShareCompanyPage,
        onShareCompanyPageIntent,
        onInviteMembers,
        onInviteMembersIntent,
        notifications,
        onMarketingHomeNavigate,
        t,
    ])

    return (
        <div className="flex h-dvh overflow-hidden bg-ds-sidebar-canvas">
            <SidebarProvider className="flex h-full overflow-hidden">
                <OrgSidebar
                    sessionData={sessionData}
                    onShareCompanyPage={onShareCompanyPage}
                    onShareCompanyPageIntent={onShareCompanyPageIntent}
                    onInviteMembers={onInviteMembers}
                    onInviteMembersIntent={onInviteMembersIntent}
                    onViewUserProfile={onViewUserProfile}
                    onViewUserProfileIntent={onViewUserProfileIntent}
                    onRouteDataIntent={onRouteDataIntent}
                />
                <div className="flex min-w-0 flex-1 flex-col bg-ds-sidebar-canvas md:m-2 md:mt-0 md:ml-0 md:peer-data-[state=collapsed]:ml-2">
                    <WorkspaceTopbar
                        sessionData={sessionData}
                        onMarketingHomeNavigate={onMarketingHomeNavigate}
                        notificationBasePath={`/org/${slug}`}
                        notificationsOpen={notificationsOpen}
                        onNotificationsOpenChange={setNotificationsOpen}
                        notifications={notifications}
                        assistantOrganizationId={state.org?.id}
                        searchItems={searchItems}
                        onSearchNavigate={handleSearchNavigate}
                        onViewUserProfile={onViewUserProfile}
                        onViewUserProfileIntent={onViewUserProfileIntent}
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
