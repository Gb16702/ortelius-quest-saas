import type {
  MessageNotificationData,
  Notification,
  NotificationBatchResult,
  NotificationPayload,
  NotificationSendResult,
  NotificationSubscriptionManager,
  NotificationWithParsedData,
  RequestNotificationData,
  SystemNotificationData,
} from './notification-models'

export interface NotificationPort {
  readonly subscriptions: NotificationSubscriptionManager
  create(userId: string, payload: NotificationPayload): Promise<Notification>
  getUserNotifications(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<NotificationWithParsedData[]>
  getUnreadCount(userId: string): Promise<number>
  markAsRead(notificationId: string, userId: string): Promise<NotificationWithParsedData | null>
  markAsUnread(notificationId: string, userId: string): Promise<NotificationWithParsedData | null>
  markAllAsRead(userId: string): Promise<number>
  archiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null>
  unarchiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null>
  archiveAll(userId: string): Promise<number>
  sendToUser(userId: string, payload: NotificationPayload): Promise<NotificationSendResult>
  sendToMultipleUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<NotificationBatchResult>
  notifyNewMessage(userId: string, data: MessageNotificationData): Promise<NotificationSendResult>
  notifyRequestUpdate(
    userId: string,
    data: RequestNotificationData
  ): Promise<NotificationSendResult>
  notifySystemMessage(userId: string, data: SystemNotificationData): Promise<NotificationSendResult>
}
