import * as v from "valibot"
import { optionalHttpUrlSchema } from "@/shared/lib/validation/url.schema"

export const notificationTypeSchema = v.picklist([
    "message",
    "request_update",
    "system",
    "conversation_update",
])

export const notificationDataPayloadSchema = v.looseObject({
    senderName: v.optional(v.string()),
    senderImage: v.optional(v.nullable(optionalHttpUrlSchema)),
    assignedByName: v.optional(v.string()),
    assignedByImage: v.optional(v.nullable(optionalHttpUrlSchema)),
    conversationId: v.optional(v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/))),
    requestNumber: v.optional(v.pipe(v.string(), v.regex(/^REQ-[A-Za-z0-9-]+$/))),
    metadata: v.optional(
        v.looseObject({
            attachments: v.optional(v.array(v.unknown())),
        })
    ),
})

export const notificationDataSchema = v.object({
    id: v.string(),
    type: notificationTypeSchema,
    title: v.optional(v.string()),
    message: v.string(),
    data: v.pipe(
        v.optional(v.nullable(notificationDataPayloadSchema)),
        v.transform((value) => value ?? undefined)
    ),
    userId: v.optional(v.string()),
    isRead: v.boolean(),
    isArchived: v.boolean(),
    createdAt: v.string(),
    readAt: v.pipe(
        v.optional(v.nullable(v.string())),
        v.transform((value) => value ?? undefined)
    ),
})

export const webSocketNotificationDataSchema = v.pipe(
    v.object({
        type: v.literal("notification:new"),
        notificationId: v.string(),
        notificationType: notificationTypeSchema,
        title: v.optional(v.string()),
        message: v.string(),
        data: v.pipe(
            v.optional(v.nullable(notificationDataPayloadSchema)),
            v.transform((value) => value ?? undefined)
        ),
        createdAt: v.string(),
        isRead: v.boolean(),
        isArchived: v.boolean(),
    }),
    v.transform((notification) => ({
        id: notification.notificationId,
        type: notification.notificationType,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        isArchived: notification.isArchived,
        createdAt: notification.createdAt,
        readAt: notification.isRead ? notification.createdAt : undefined,
    }))
)

export const notificationsResponseSchema = v.looseObject({
    data: v.looseObject({
        notifications: v.array(notificationDataSchema),
    }),
})

export const unreadCountResponseSchema = v.looseObject({
    data: v.looseObject({
        count: v.number(),
    }),
})

export const notificationErrorResponseSchema = v.looseObject({
    message: v.optional(v.string()),
})

export type NotificationDataPayload = v.InferOutput<typeof notificationDataPayloadSchema>
export type NotificationData = v.InferOutput<typeof notificationDataSchema>
