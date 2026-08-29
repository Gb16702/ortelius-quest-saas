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
} from './application/notification-models'
import {
  getNotificationSubscriptions,
  getNotificationUseCases,
} from './infrastructure/notification-use-cases'

export class NotificationApplicationService {
  get subscriptions(): NotificationSubscriptionManager {
    return getNotificationSubscriptions()
  }

  async create(userId: string, payload: NotificationPayload): Promise<Notification> {
    const useCases = getNotificationUseCases()
    return await useCases.create.execute({ userId, payload })
  }

  async getUserNotifications(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<NotificationWithParsedData[]> {
    const useCases = getNotificationUseCases()
    return await useCases.listUserNotifications.execute({ userId, limit, offset })
  }

  async getUnreadCount(userId: string): Promise<number> {
    const useCases = getNotificationUseCases()
    return await useCases.getUnreadCount.execute({ userId })
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const useCases = getNotificationUseCases()
    return await useCases.readState.markAsRead({ notificationId, userId })
  }

  async markAsUnread(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const useCases = getNotificationUseCases()
    return await useCases.readState.markAsUnread({ notificationId, userId })
  }

  async markAllAsRead(userId: string): Promise<number> {
    const useCases = getNotificationUseCases()
    return await useCases.readState.markAllAsRead({ userId })
  }

  async archiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const useCases = getNotificationUseCases()
    return await useCases.archive.archive({ notificationId, userId })
  }

  async unarchiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const useCases = getNotificationUseCases()
    return await useCases.archive.unarchive({ notificationId, userId })
  }

  async archiveAll(userId: string): Promise<number> {
    const useCases = getNotificationUseCases()
    return await useCases.archive.archiveAll({ userId })
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<NotificationSendResult> {
    const useCases = getNotificationUseCases()
    return await useCases.send.sendToUser({ userId, payload })
  }

  async sendToMultipleUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<NotificationBatchResult> {
    const useCases = getNotificationUseCases()
    return await useCases.send.sendToMultipleUsers({ userIds, payload })
  }

  async notifyNewMessage(
    userId: string,
    data: MessageNotificationData
  ): Promise<NotificationSendResult> {
    const useCases = getNotificationUseCases()
    return await useCases.send.notifyNewMessage({ userId, data })
  }

  async notifyRequestUpdate(
    userId: string,
    data: RequestNotificationData
  ): Promise<NotificationSendResult> {
    const useCases = getNotificationUseCases()
    return await useCases.send.notifyRequestUpdate({ userId, data })
  }

  async notifySystemMessage(
    userId: string,
    data: SystemNotificationData
  ): Promise<NotificationSendResult> {
    const useCases = getNotificationUseCases()
    return await useCases.send.notifySystemMessage({ userId, data })
  }
}

export const notificationApplicationService = new NotificationApplicationService()
