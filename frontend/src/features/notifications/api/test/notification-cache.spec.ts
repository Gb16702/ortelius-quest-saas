import { describe, expect, it } from "bun:test"
import { QueryClient } from "@tanstack/react-query"
import type { NotificationData } from "../../model/schemas/notification.schema"
import { notificationsKeys } from "../notification.api"
import { prependNotificationToCachedFirstPages } from "../notification.cache"

function buildNotification(id: string): NotificationData {
    return {
        id,
        type: "request_update",
        title: "Request update",
        message: "A request changed",
        data: undefined,
        isRead: false,
        isArchived: false,
        createdAt: "2026-05-14T00:00:00.000Z",
        readAt: undefined,
    }
}

describe("notification cache", () => {
    it("does not synthesize a loaded list when notifications have not been opened", () => {
        const queryClient = new QueryClient()
        const listKey = notificationsKeys.list(20, 0)

        prependNotificationToCachedFirstPages(queryClient, buildNotification("notification-1"))

        expect(queryClient.getQueryData(listKey)).toBeUndefined()
    })

    it("prepends websocket notifications to already loaded first pages", () => {
        const queryClient = new QueryClient()
        const listKey = notificationsKeys.list(20, 0)
        queryClient.setQueryData<NotificationData[]>(listKey, [
            buildNotification("notification-older"),
        ])

        prependNotificationToCachedFirstPages(queryClient, buildNotification("notification-new"))

        expect(queryClient.getQueryData<NotificationData[]>(listKey)?.map(({ id }) => id)).toEqual([
            "notification-new",
            "notification-older",
        ])
    })
})
