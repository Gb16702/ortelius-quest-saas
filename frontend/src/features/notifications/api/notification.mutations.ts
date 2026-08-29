import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query"
import { readJsonResponse } from "@/shared/api/http.response"
import { getNotificationErrorMessage, notificationsKeys } from "./notification.api"
import {
    applyUnreadCountDelta,
    restoreCachedNotificationLists,
    setUnreadCount,
    updateCachedNotificationLists,
} from "./notification.cache"

async function assertMutationSucceeded(response: Response, fallbackMessage: string): Promise<void> {
    const payload = await readJsonResponse(response)
    if (!response.ok) throw new Error(getNotificationErrorMessage(payload, fallbackMessage))
}

async function cancelNotificationQueries(queryClient: QueryClient): Promise<void> {
    await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKeys.lists() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.unreadCount() }),
    ])
}

export function useMarkAsReadMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const res = await fetch(`/api/notifications/${notificationId}/read`, {
                method: "PATCH",
                credentials: "include",
            })

            await assertMutationSucceeded(res, "Failed to mark notification as read")

            return notificationId
        },
        onMutate: async (notificationId) => {
            await cancelNotificationQueries(queryClient)

            const now = new Date().toISOString()
            const { previousLists, unreadCountDelta } = updateCachedNotificationLists(
                queryClient,
                (notification) =>
                    notification.id === notificationId
                        ? { ...notification, isRead: true, readAt: now }
                        : notification
            )

            const previousCount = queryClient.getQueryData<number>(notificationsKeys.unreadCount())
            applyUnreadCountDelta(queryClient, unreadCountDelta)

            return { previousLists, previousCount }
        },
        onError: (_err, _notificationId, context) => {
            if (context?.previousLists) {
                restoreCachedNotificationLists(queryClient, context.previousLists)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationsKeys.unreadCount(), context.previousCount)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
        },
    })
}

export function useMarkAsUnreadMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const res = await fetch(`/api/notifications/${notificationId}/unread`, {
                method: "PATCH",
                credentials: "include",
            })

            await assertMutationSucceeded(res, "Failed to mark notification as unread")

            return notificationId
        },
        onMutate: async (notificationId) => {
            await cancelNotificationQueries(queryClient)

            const { previousLists, unreadCountDelta } = updateCachedNotificationLists(
                queryClient,
                (notification) =>
                    notification.id === notificationId
                        ? { ...notification, isRead: false, readAt: undefined }
                        : notification
            )

            const previousCount = queryClient.getQueryData<number>(notificationsKeys.unreadCount())
            applyUnreadCountDelta(queryClient, unreadCountDelta)

            return { previousLists, previousCount }
        },
        onError: (_err, _notificationId, context) => {
            if (context?.previousLists) {
                restoreCachedNotificationLists(queryClient, context.previousLists)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationsKeys.unreadCount(), context.previousCount)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
        },
    })
}

export function useMarkAllAsReadMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/notifications/mark-all-read`, {
                method: "PATCH",
                credentials: "include",
            })

            await assertMutationSucceeded(res, "Failed to mark all notifications as read")
        },
        onMutate: async () => {
            await cancelNotificationQueries(queryClient)

            const now = new Date().toISOString()
            const { previousLists } = updateCachedNotificationLists(queryClient, (notification) =>
                !notification.isRead ? { ...notification, isRead: true, readAt: now } : notification
            )

            const previousCount = queryClient.getQueryData<number>(notificationsKeys.unreadCount())
            setUnreadCount(queryClient, 0)

            return { previousLists, previousCount }
        },
        onError: (_err, _vars, context) => {
            if (context?.previousLists) {
                restoreCachedNotificationLists(queryClient, context.previousLists)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationsKeys.unreadCount(), context.previousCount)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
        },
    })
}

export function useArchiveNotificationMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const res = await fetch(`/api/notifications/${notificationId}/archive`, {
                method: "PATCH",
                credentials: "include",
            })

            await assertMutationSucceeded(res, "Failed to archive notification")

            return notificationId
        },
        onMutate: async (notificationId) => {
            await cancelNotificationQueries(queryClient)

            const { previousLists, unreadCountDelta } = updateCachedNotificationLists(
                queryClient,
                (notification) =>
                    notification.id === notificationId
                        ? { ...notification, isArchived: true }
                        : notification
            )

            const previousCount = queryClient.getQueryData<number>(notificationsKeys.unreadCount())
            applyUnreadCountDelta(queryClient, unreadCountDelta)

            return { previousLists, previousCount }
        },
        onError: (_err, _notificationId, context) => {
            if (context?.previousLists) {
                restoreCachedNotificationLists(queryClient, context.previousLists)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationsKeys.unreadCount(), context.previousCount)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
        },
    })
}

export function useUnarchiveNotificationMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const res = await fetch(`/api/notifications/${notificationId}/unarchive`, {
                method: "PATCH",
                credentials: "include",
            })

            await assertMutationSucceeded(res, "Failed to unarchive notification")

            return notificationId
        },
        onMutate: async (notificationId) => {
            await cancelNotificationQueries(queryClient)

            const { previousLists, unreadCountDelta } = updateCachedNotificationLists(
                queryClient,
                (notification) =>
                    notification.id === notificationId
                        ? { ...notification, isArchived: false }
                        : notification
            )

            const previousCount = queryClient.getQueryData<number>(notificationsKeys.unreadCount())
            applyUnreadCountDelta(queryClient, unreadCountDelta)

            return { previousLists, previousCount }
        },
        onError: (_err, _notificationId, context) => {
            if (context?.previousLists) {
                restoreCachedNotificationLists(queryClient, context.previousLists)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationsKeys.unreadCount(), context.previousCount)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
        },
    })
}

export function useArchiveAllMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/notifications/archive-all`, {
                method: "PATCH",
                credentials: "include",
            })

            await assertMutationSucceeded(res, "Failed to archive all notifications")
        },
        onMutate: async () => {
            await cancelNotificationQueries(queryClient)

            const { previousLists } = updateCachedNotificationLists(
                queryClient,
                (notification) => ({ ...notification, isArchived: true })
            )

            const previousCount = queryClient.getQueryData<number>(notificationsKeys.unreadCount())
            setUnreadCount(queryClient, 0)

            return { previousLists, previousCount }
        },
        onError: (_err, _vars, context) => {
            if (context?.previousLists) {
                restoreCachedNotificationLists(queryClient, context.previousLists)
            }
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationsKeys.unreadCount(), context.previousCount)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() })
        },
    })
}
