import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { NotificationData } from "../model/schemas/notification.schema"
import { notificationsKeys } from "./notification.api"

type CachedNotificationsLists = Array<[QueryKey, NotificationData[] | undefined]>

interface NotificationsListParams {
    limit: number
    offset: number
}

interface CachedNotificationsUpdate {
    previousLists: CachedNotificationsLists
    unreadCountDelta: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function getNotificationsListParams(queryKey: QueryKey): NotificationsListParams | null {
    if (!Array.isArray(queryKey) || queryKey.length !== 3) return null
    if (queryKey[0] !== "notifications" || queryKey[1] !== "list") return null

    const params = queryKey[2]
    if (!isRecord(params)) return null
    if (typeof params.limit !== "number" || typeof params.offset !== "number") return null

    return {
        limit: params.limit,
        offset: params.offset,
    }
}

export function isUnreadCountedNotification(notification: NotificationData): boolean {
    return !notification.isRead && !notification.isArchived && notification.type !== "message"
}

export function applyUnreadCountDelta(queryClient: QueryClient, delta: number): void {
    if (delta === 0) return

    queryClient.setQueryData<number>(notificationsKeys.unreadCount(), (currentCount) => {
        if (currentCount === undefined) return currentCount
        return Math.max(0, currentCount + delta)
    })
}

export function setUnreadCount(queryClient: QueryClient, count: number): void {
    queryClient.setQueryData<number>(notificationsKeys.unreadCount(), (currentCount) => {
        if (currentCount === undefined) return currentCount
        return Math.max(0, count)
    })
}

export function updateCachedNotificationLists(
    queryClient: QueryClient,
    updateNotification: (notification: NotificationData) => NotificationData
): CachedNotificationsUpdate {
    const previousLists = queryClient.getQueriesData<NotificationData[]>({
        queryKey: notificationsKeys.lists(),
    })
    const updatedNotificationIds = new Set<string>()
    let unreadCountDelta = 0

    queryClient.setQueriesData<NotificationData[]>(
        { queryKey: notificationsKeys.lists() },
        (notifications) => {
            if (!notifications) return notifications

            return notifications.map((notification) => {
                const nextNotification = updateNotification(notification)
                if (nextNotification === notification) return notification

                if (!updatedNotificationIds.has(notification.id)) {
                    const wasUnreadCounted = isUnreadCountedNotification(notification)
                    const isNowUnreadCounted = isUnreadCountedNotification(nextNotification)

                    if (wasUnreadCounted !== isNowUnreadCounted) {
                        unreadCountDelta += isNowUnreadCounted ? 1 : -1
                    }

                    updatedNotificationIds.add(notification.id)
                }

                return nextNotification
            })
        }
    )

    return { previousLists, unreadCountDelta }
}

export function restoreCachedNotificationLists(
    queryClient: QueryClient,
    previousLists: CachedNotificationsLists
): void {
    for (const [queryKey, notifications] of previousLists) {
        queryClient.setQueryData(queryKey, notifications)
    }
}

export function prependNotificationToCachedFirstPages(
    queryClient: QueryClient,
    notification: NotificationData
): void {
    const cachedListQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: notificationsKeys.lists() })

    for (const query of cachedListQueries) {
        const params = getNotificationsListParams(query.queryKey)
        if (!params || params.offset !== 0) continue
        if (query.state.data === undefined) continue

        queryClient.setQueryData<NotificationData[]>(query.queryKey, (notifications) => {
            if (!notifications) return notifications
            if (notifications.some((existing) => existing.id === notification.id)) {
                return notifications
            }
            return [notification, ...notifications].slice(0, params.limit)
        })
    }
}
