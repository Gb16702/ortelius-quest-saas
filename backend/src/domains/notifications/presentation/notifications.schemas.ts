import { z } from 'zod'

export const notificationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 0)),
})

export const notificationIdParamSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
})

export const notificationPayloadSchema = z.object({
  type: z.enum(['message', 'conversation_update', 'request_update', 'system']),
  title: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  userId: z.string().min(1, 'User ID is required'),
})

export const messageNotificationDataSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
  senderId: z.string().min(1, 'Sender ID is required'),
  senderName: z.string().min(1, 'Sender name is required'),
  senderImage: z.string().nullable().optional(),
  content: z.string().min(1, 'Content is required'),
  conversationName: z.string().optional(),
})

export const requestNotificationDataSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  lifecycleStatus: z.string().min(1, 'Lifecycle status is required'),
  closedReason: z.string().nullable().optional(),
  details: z.string().min(1, 'Details are required'),
  organizationName: z.string().optional(),
  requestNumber: z.string().optional(),
  action: z
    .enum([
      'request_submitted',
      'request_received',
      'request_rejected',
      'request_canceled',
      'request_quoted',
      'request_completed',
    ])
    .optional(),
})

export const systemNotificationDataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  severity: z.enum(['info', 'warning', 'error', 'success']).optional().default('info'),
  action: z
    .object({
      label: z.string().min(1, 'Action label is required'),
      url: z.string().url('Valid URL required'),
    })
    .optional(),
})

export const sendNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  payload: notificationPayloadSchema,
})

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
})

export type NotificationQuery = z.infer<typeof notificationQuerySchema>
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>
export type NotificationPayloadInput = z.infer<typeof notificationPayloadSchema>
export type MessageNotificationDataInput = z.infer<typeof messageNotificationDataSchema>
export type RequestNotificationDataInput = z.infer<typeof requestNotificationDataSchema>
export type SystemNotificationDataInput = z.infer<typeof systemNotificationDataSchema>
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>
