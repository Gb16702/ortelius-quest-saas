import { Bell } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { useNotifications } from "../model/notification.context"
import { NotificationPopover } from "./notification-panel"

interface NotificationMenuProps {
    basePath: string
    onNavigate?: (href: string) => void
}

export function NotificationMenu({ basePath, onNavigate }: NotificationMenuProps) {
    const { unreadCount } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <NotificationPopover
            open={isOpen}
            onOpenChange={setIsOpen}
            basePath={basePath}
            onNavigate={onNavigate}
        >
            <Button
                variant={"outline"}
                type="button"
                className="relative inline-flex h-8 w-8 items-center justify-center whitespace-nowrap rounded-full border border-ds-surface-border bg-ds-surface font-medium text-ds-fg text-sm transition-colors"
            >
                <Bell className="h-4.5 w-4.5" strokeWidth={2} />
                {unreadCount > 0 && (
                    <Badge
                        variant="accent"
                        className="absolute top-0 right-0 flex h-2 w-2 items-center justify-center rounded-full p-0 text-xs"
                    />
                )}
            </Button>
        </NotificationPopover>
    )
}
