export type {
  MessageNotificationData,
  NotificationPayload,
  RequestNotificationData,
  SystemNotificationData,
} from '../domain/notification-models'

export interface Notification {
  id: string
  userId: string
  type: string
  title?: string | null
  message: string
  data?: string | null
  isRead: boolean
  isArchived: boolean
  createdAt: Date
  readAt?: Date | null
}

export interface NotificationWithParsedData extends Omit<Notification, 'data'> {
  data?: Record<string, unknown> | null
}

export interface NotificationSendResult {
  saved: boolean
  sent: boolean
  notificationId: string
}

export interface NotificationBatchResult {
  success: number
  failed: number
}

export interface NotificationSubscriptionManager {
  subscribe(userId: string): void
  unsubscribe(userId: string): void
  getActiveSubscribers(): string[]
  getSubscriberCount(): number
  isSubscribed(userId: string): boolean
}
