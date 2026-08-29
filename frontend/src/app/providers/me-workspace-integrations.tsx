import type { ReactNode } from "react"
import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import { MemberProfileDialogManager, useMemberProfileDialog } from "@/features/members"
import { NotificationPopover, useNotifications } from "@/features/notifications"
import { LeaveOrganizationDialogManager, useLeaveOrganizationDialog } from "@/features/organization"
import { RequestModalManager, useRequestSheet } from "@/features/requests"
import type { SidebarNotifications } from "@/widgets/layout"

interface MeWorkspaceLayoutProps {
    notifications: SidebarNotifications
}

interface MeWorkspaceIntegrationsProps {
    sessionData: SessionResponse | null
    activeOrganization: ActiveOrganization | null
    onNavigate?: (href: string) => void
    onRevalidate?: () => Promise<void> | void
    children: (props: MeWorkspaceLayoutProps) => ReactNode
}

export function MeWorkspaceIntegrations({
    sessionData,
    activeOrganization,
    onNavigate,
    onRevalidate,
    children,
}: MeWorkspaceIntegrationsProps) {
    const { unreadCount } = useNotifications()
    const { openRequest, isOpen: isRequestOpen } = useRequestSheet()
    const { openProfileUserId } = useMemberProfileDialog()
    const { isOpen: isLeaveOrganizationOpen } = useLeaveOrganizationDialog()
    const notifications: SidebarNotifications = {
        unreadCount,
        renderPopover: ({ open, onOpenChange, basePath, children }) => (
            <NotificationPopover
                open={open}
                onOpenChange={onOpenChange}
                basePath={basePath}
                onNavigate={onNavigate}
            >
                {children}
            </NotificationPopover>
        ),
    }

    return (
        <>
            {children({ notifications })}
            {isLeaveOrganizationOpen && (
                <LeaveOrganizationDialogManager
                    sessionData={sessionData}
                    onNavigate={onNavigate}
                    onRevalidate={onRevalidate}
                />
            )}
            {sessionData && isRequestOpen && (
                <RequestModalManager
                    sessionData={sessionData}
                    defaultScope="personal"
                    currentUserRole={null}
                    onNavigate={onNavigate}
                />
            )}
            {openProfileUserId && (
                <MemberProfileDialogManager
                    sessionData={sessionData}
                    activeOrganization={activeOrganization}
                    onOpenRequest={openRequest}
                    onNavigate={onNavigate}
                />
            )}
        </>
    )
}
