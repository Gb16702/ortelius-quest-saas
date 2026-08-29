import { useQuery } from "@tanstack/react-query"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    notificationErrorResponseSchema,
    notificationsResponseSchema,
    unreadCountResponseSchema,
} from "../model/schemas/notification.schema"

export function getNotificationErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(notificationErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

export const notificationsKeys = {
    all: ["notifications"] as const,
    lists: () => [...notificationsKeys.all, "list"] as const,
    list: (limit: number, offset: number) =>
        [...notificationsKeys.lists(), { limit, offset }] as const,
    unreadCount: () => [...notificationsKeys.all, "unread-count"] as const,
}

interface NotificationsQueryOptions {
    enabled?: boolean
}

export function useNotificationsQuery(
    limit = 20,
    offset = 0,
    options: NotificationsQueryOptions = {}
) {
    return useQuery({
        queryKey: notificationsKeys.list(limit, offset),
        queryFn: async () => {
            const res = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
                credentials: "include",
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw new Error(getNotificationErrorMessage(json, "Failed to fetch notifications"))
            }

            return parseSchema(notificationsResponseSchema, json).data.notifications
        },
        enabled: options.enabled ?? true,
        staleTime: 5 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}

export function useUnreadCountQuery() {
    return useQuery({
        queryKey: notificationsKeys.unreadCount(),
        queryFn: async () => {
            const res = await fetch(`/api/notifications/unread-count`, {
                credentials: "include",
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw new Error(getNotificationErrorMessage(json, "Failed to fetch unread count"))
            }

            return parseSchema(unreadCountResponseSchema, json).data.count
        },
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}
