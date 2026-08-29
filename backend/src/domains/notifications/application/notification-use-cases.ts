import type {
  MessageNotificationData,
  Notification,
  NotificationBatchResult,
  NotificationPayload,
  NotificationSendResult,
  NotificationWithParsedData,
  RequestNotificationData,
  SystemNotificationData,
} from './notification-models'
import type { NotificationPort } from './ports'

export class CreateNotificationUseCase {
  constructor(private readonly notifications: NotificationPort) {}

  async execute(command: { userId: string; payload: NotificationPayload }): Promise<Notification> {
    return await this.notifications.create(command.userId, command.payload)
  }
}

export class ListUserNotificationsUseCase {
  constructor(private readonly notifications: NotificationPort) {}

  async execute(command: {
    userId: string
    limit?: number
    offset?: number
  }): Promise<NotificationWithParsedData[]> {
    return await this.notifications.getUserNotifications(
      command.userId,
      command.limit,
      command.offset
    )
  }
}

export class GetUnreadNotificationCountUseCase {
  constructor(private readonly notifications: NotificationPort) {}

  async execute(command: { userId: string }): Promise<number> {
    return await this.notifications.getUnreadCount(command.userId)
  }
}

export class MarkNotificationReadStateUseCase {
  constructor(private readonly notifications: NotificationPort) {}

  async markAsRead(command: {
    notificationId: string
    userId: string
  }): Promise<NotificationWithParsedData | null> {
    return await this.notifications.markAsRead(command.notificationId, command.userId)
  }

  async markAsUnread(command: {
    notificationId: string
    userId: string
  }): Promise<NotificationWithParsedData | null> {
    return await this.notifications.markAsUnread(command.notificationId, command.userId)
  }

  async markAllAsRead(command: { userId: string }): Promise<number> {
    return await this.notifications.markAllAsRead(command.userId)
  }
}

export class ArchiveNotificationUseCase {
  constructor(private readonly notifications: NotificationPort) {}

  async archive(command: {
    notificationId: string
    userId: string
  }): Promise<NotificationWithParsedData | null> {
    return await this.notifications.archiveNotification(command.notificationId, command.userId)
  }

  async unarchive(command: {
    notificationId: string
    userId: string
  }): Promise<NotificationWithParsedData | null> {
    return await this.notifications.unarchiveNotification(command.notificationId, command.userId)
  }

  async archiveAll(command: { userId: string }): Promise<number> {
    return await this.notifications.archiveAll(command.userId)
  }
}

export class SendNotificationUseCase {
  constructor(private readonly notifications: NotificationPort) {}

  async sendToUser(command: {
    userId: string
    payload: NotificationPayload
  }): Promise<NotificationSendResult> {
    return await this.notifications.sendToUser(command.userId, command.payload)
  }

  async sendToMultipleUsers(command: {
    userIds: string[]
    payload: NotificationPayload
  }): Promise<NotificationBatchResult> {
    return await this.notifications.sendToMultipleUsers(command.userIds, command.payload)
  }

  async notifyNewMessage(command: {
    userId: string
    data: MessageNotificationData
  }): Promise<NotificationSendResult> {
    return await this.notifications.notifyNewMessage(command.userId, command.data)
  }

  async notifyRequestUpdate(command: {
    userId: string
    data: RequestNotificationData
  }): Promise<NotificationSendResult> {
    return await this.notifications.notifyRequestUpdate(command.userId, command.data)
  }

  async notifySystemMessage(command: {
    userId: string
    data: SystemNotificationData
  }): Promise<NotificationSendResult> {
    return await this.notifications.notifySystemMessage(command.userId, command.data)
  }
}
