import type { ReactNode } from "react"

export interface SidebarNotificationRenderProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    basePath: string
    children: ReactNode
}

export interface SidebarNotifications {
    unreadCount: number
    renderPopover: (props: SidebarNotificationRenderProps) => ReactNode
}
