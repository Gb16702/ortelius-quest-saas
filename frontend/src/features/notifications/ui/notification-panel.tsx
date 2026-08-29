import {
    Archive,
    Bell,
    FileText,
    Inbox as InboxIcon,
    MessageSquare,
    Settings,
    User,
} from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { generateAvatarUrl } from "@/shared/lib/avatar"
import { cn } from "@/shared/lib/class-names"
import { formatRelativeTime } from "@/shared/lib/date"
import { getSafeHttpUrl } from "@/shared/lib/validation/url.schema"
import { Avatar, AvatarImage } from "@/shared/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { Skeleton } from "@/shared/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { useNotifications } from "../model/notification.context"
import type { NotificationData } from "../model/schemas/notification.schema"

interface NotificationPopoverProps {
    children: ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
    basePath: string
    onNavigate?: (href: string) => void
}

type FilterType = "inbox" | "unread" | "archive"

const TABS: { value: FilterType; label: string }[] = [
    { value: "inbox", label: "Inbox" },
    { value: "unread", label: "Unread" },
    { value: "archive", label: "Archive" },
]

const renderNotificationIcon = (notification: NotificationData) => {
    if (notification.type === "message" && notification.data?.senderName) {
        const avatarUrl =
            getSafeHttpUrl(notification.data.senderImage) ||
            generateAvatarUrl(notification.data.senderName)

        return (
            <Avatar>
                <AvatarImage src={avatarUrl} alt={notification.data.senderName} />
            </Avatar>
        )
    }

    if (notification.type === "request_update" && notification.data?.assignedByName) {
        const avatarUrl =
            getSafeHttpUrl(notification.data.assignedByImage) ||
            generateAvatarUrl(notification.data.assignedByName)

        return (
            <Avatar>
                <AvatarImage src={avatarUrl} alt={notification.data.assignedByName} />
            </Avatar>
        )
    }

    switch (notification.type) {
        case "message":
            return <MessageSquare className="size-5" />
        case "request_update":
            return <FileText className="size-5" />
        case "conversation_update":
            return <User className="size-5" />
        case "system":
            return <Settings className="size-5" />
        default:
            return <Bell className="size-5" />
    }
}

export function NotificationPopover({
    children,
    open,
    onOpenChange,
    basePath,
    onNavigate,
}: NotificationPopoverProps) {
    const {
        notifications,
        markAsRead,
        markAllAsRead,
        archiveNotification,
        unarchiveNotification,
        archiveAll,
        isLoading,
        setNotificationsPanelOpen,
    } = useNotifications()
    const [filter, setFilter] = useState<FilterType>("inbox")

    useEffect(() => {
        setNotificationsPanelOpen(open)
        return () => setNotificationsPanelOpen(false)
    }, [open, setNotificationsPanelOpen])

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            setNotificationsPanelOpen(nextOpen)
            onOpenChange(nextOpen)
        },
        [onOpenChange, setNotificationsPanelOpen]
    )

    const computeNotificationUrl = (notification: NotificationData) => {
        if (notification.type === "message" && notification.data?.conversationId) {
            return `${basePath}/chat/${encodeURIComponent(notification.data.conversationId)}`
        }
        if (notification.type === "request_update" && notification.data?.requestNumber) {
            return `${basePath}/requests?request=${encodeURIComponent(notification.data.requestNumber)}`
        }
        return null
    }

    const formatNotificationMessage = (notification: NotificationData): ReactNode => {
        if (!notification.message || notification.message.trim() === "") {
            const attachments = notification.data?.metadata?.attachments
            if (attachments && attachments.length > 0) {
                const fileCount = attachments.length
                return `Shared ${fileCount === 1 ? "a file" : `${fileCount} files`}`
            }
            return "New message"
        }

        const parts = notification.message.split(/(REQ-\d+|QT-[\w-]+)/)
        if (parts.length === 1) return notification.message

        return parts.map((part: string, i: number) =>
            /^(REQ-\d+|QT-[\w-]+)$/.test(part) ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                <span key={i} className="font-medium text-ds-fg">
                    {part}
                </span>
            ) : (
                part
            )
        )
    }

    const navigateToNotification = (notification: NotificationData) => {
        const url = computeNotificationUrl(notification)
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        if (url) {
            onOpenChange(false)
            if (onNavigate) {
                onNavigate(url)
                return
            }
            window.location.assign(url)
        }
    }

    const filteredNotifications = notifications.filter((notification) => {
        if (notification.type === "message") return false
        if (filter === "unread") return !notification.isRead && !notification.isArchived
        if (filter === "archive") return notification.isArchived
        return !notification.isArchived
    })

    const hasUnread = filteredNotifications.some((n) => !n.isRead)
    const hasNotifications = filteredNotifications.length > 0

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent
                className="flex max-h-[min(680px,80vh)] w-[400px] flex-col overflow-hidden p-0"
                side="top"
                align="end"
                sideOffset={12}
                collisionPadding={24}
            >
                <div className="flex flex-shrink-0 border-ds-surface-border border-b">
                    {TABS.map((tab) => (
                        <button
                            type="button"
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={
                                "relative px-3 py-3.5 font-medium text-ds-fg text-sm transition-colors"
                            }
                        >
                            {tab.label}
                            {filter === tab.value && (
                                <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-ds-fg" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <NotificationListSkeleton />
                    ) : !hasNotifications ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                            <Bell className="size-5 text-ds-fg-muted" />
                            <p className="text-ds-fg-muted text-sm">
                                {filter === "inbox"
                                    ? "No notifications yet"
                                    : filter === "unread"
                                      ? "All caught up"
                                      : "No archived notifications"}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {filteredNotifications.map((notification, index) => {
                                const isLast = index === filteredNotifications.length - 1
                                const isArchived = notification.isArchived

                                return (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "group relative flex w-full items-start transition-colors hover:bg-ds-surface-hover",
                                            !isLast && "border-ds-surface-border border-b"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => navigateToNotification(notification)}
                                            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3 pr-12 text-left"
                                        >
                                            <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-ds-canvas">
                                                {renderNotificationIcon(notification)}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                {notification.title && (
                                                    <p className="line-clamp-1 font-medium text-ds-fg text-sm">
                                                        {notification.title}
                                                    </p>
                                                )}
                                                <p
                                                    className={cn(
                                                        "line-clamp-2 font-normal text-sm",
                                                        notification.isRead
                                                            ? "text-ds-fg-muted"
                                                            : "text-ds-fg"
                                                    )}
                                                >
                                                    {formatNotificationMessage(notification)}
                                                </p>
                                                <p className="mt-1 font-normal text-ds-fg-muted text-xs">
                                                    {formatRelativeTime(
                                                        new Date(notification.createdAt)
                                                    )}
                                                </p>
                                            </div>

                                            {!notification.isRead && (
                                                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-ds-accent-700" />
                                            )}
                                        </button>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ds-fg-muted opacity-0 transition-opacity hover:text-ds-fg group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (isArchived) {
                                                            unarchiveNotification(notification.id)
                                                        } else {
                                                            archiveNotification(notification.id)
                                                        }
                                                    }}
                                                >
                                                    {isArchived ? (
                                                        <InboxIcon className="size-4" />
                                                    ) : (
                                                        <Archive className="size-4" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {isArchived ? "Move to inbox" : "Archive"}
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {hasNotifications && (
                    <div className="flex flex-shrink-0 items-center justify-between border-ds-surface-border border-t p-4">
                        {hasUnread && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="font-medium text-ds-fg text-sm"
                            >
                                Mark all as read
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={archiveAll}
                            className="ml-auto font-medium text-ds-fg text-sm"
                        >
                            Archive all
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

function NotificationListSkeleton() {
    return (
        <div className="flex flex-col">
            {Array.from({ length: 4 }, (_, index) => (
                <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed skeleton rows
                    key={index}
                    className="flex items-start gap-3 border-ds-surface-border border-b px-4 py-3"
                >
                    <Skeleton className="size-8 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3 w-36 rounded-xs" />
                        <Skeleton className="h-3 w-full rounded-xs" />
                        <Skeleton className="h-3 w-20 rounded-xs" />
                    </div>
                </div>
            ))}
        </div>
    )
}
