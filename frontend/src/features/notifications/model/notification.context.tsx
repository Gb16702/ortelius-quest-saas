import { useQueryClient } from "@tanstack/react-query"
import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    notificationsKeys,
    useNotificationsQuery,
    useUnreadCountQuery,
} from "../api/notification.api"
import {
    isUnreadCountedNotification,
    prependNotificationToCachedFirstPages,
} from "../api/notification.cache"
import {
    useArchiveAllMutation,
    useArchiveNotificationMutation,
    useMarkAllAsReadMutation,
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useUnarchiveNotificationMutation,
} from "../api/notification.mutations"
import {
    type NotificationData,
    webSocketNotificationDataSchema,
} from "./schemas/notification.schema"

interface NotificationContextType {
    notifications: NotificationData[]
    unreadCount: number
    isConnected: boolean
    isLoading: boolean
    markAsRead: (notificationId: string) => void
    markAsUnread: (notificationId: string) => void
    markAllAsRead: () => void
    archiveNotification: (notificationId: string) => void
    unarchiveNotification: (notificationId: string) => void
    archiveAll: () => void
    refreshNotifications: () => void
    setNotificationsPanelOpen: (open: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
    const context = use(NotificationContext)
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider")
    }
    return context
}

interface NotificationProviderProps {
    children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const queryClient = useQueryClient()
    const { isConnected, subscribe } = useWebSocket()
    const [isNotificationsPanelOpen, setNotificationsPanelOpen] = useState(false)

    const notificationsQuery = useNotificationsQuery(20, 0, {
        enabled: isNotificationsPanelOpen,
    })
    const notifications = notificationsQuery.data ?? []
    const isLoading = isNotificationsPanelOpen && notificationsQuery.isLoading
    const { data: unreadCount = 0 } = useUnreadCountQuery()

    const markAsReadMutation = useMarkAsReadMutation()
    const markAsUnreadMutation = useMarkAsUnreadMutation()
    const markAllAsReadMutation = useMarkAllAsReadMutation()
    const archiveNotificationMutation = useArchiveNotificationMutation()
    const unarchiveNotificationMutation = useUnarchiveNotificationMutation()
    const archiveAllMutation = useArchiveAllMutation()

    const markAsRead = useCallback(
        (notificationId: string) => {
            markAsReadMutation.mutate(notificationId)
        },
        [markAsReadMutation]
    )

    const markAsUnread = useCallback(
        (notificationId: string) => {
            markAsUnreadMutation.mutate(notificationId)
        },
        [markAsUnreadMutation]
    )

    const markAllAsRead = useCallback(() => {
        markAllAsReadMutation.mutate()
    }, [markAllAsReadMutation])

    const archiveNotification = useCallback(
        (notificationId: string) => {
            archiveNotificationMutation.mutate(notificationId)
        },
        [archiveNotificationMutation]
    )

    const unarchiveNotification = useCallback(
        (notificationId: string) => {
            unarchiveNotificationMutation.mutate(notificationId)
        },
        [unarchiveNotificationMutation]
    )

    const archiveAll = useCallback(() => {
        archiveAllMutation.mutate()
    }, [archiveAllMutation])

    const refreshNotifications = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
        queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
    }, [queryClient])

    useEffect(() => {
        const unsubscribe = subscribe((message) => {
            if (message.type === "notification:new") {
                const parsed = safeParseSchema(webSocketNotificationDataSchema, message)
                if (!parsed.success) {
                    console.error("Invalid notification WebSocket payload:", parsed.error)
                    return
                }
                const newNotification = parsed.data

                prependNotificationToCachedFirstPages(queryClient, newNotification)

                if (isUnreadCountedNotification(newNotification)) {
                    queryClient.setQueryData<number>(
                        notificationsKeys.unreadCount(),
                        (currentCount) => (currentCount ?? 0) + 1
                    )
                }
            }
        })

        return unsubscribe
    }, [subscribe, queryClient])

    const value = useMemo<NotificationContextType>(
        () => ({
            notifications,
            unreadCount,
            isConnected,
            isLoading,
            markAsRead,
            markAsUnread,
            markAllAsRead,
            archiveNotification,
            unarchiveNotification,
            archiveAll,
            refreshNotifications,
            setNotificationsPanelOpen,
        }),
        [
            notifications,
            unreadCount,
            isConnected,
            isLoading,
            markAsRead,
            markAsUnread,
            markAllAsRead,
            archiveNotification,
            unarchiveNotification,
            archiveAll,
            refreshNotifications,
        ]
    )

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export type { NotificationData } from "./schemas/notification.schema"
