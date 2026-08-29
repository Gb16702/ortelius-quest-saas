import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { notification } from '../../../infrastructure/database/db/schemas/chat-schema'
import { sendToUser } from '../../../infrastructure/messaging/websocket.service'
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
} from '../application/notification-models'
import type { NotificationPort } from '../application/ports'
import {
  buildMessageNotificationPayload,
  buildRequestUpdateNotificationPayload,
  buildSystemNotificationPayload,
} from '../domain'

class SubscriptionManager implements NotificationSubscriptionManager {
  private subscribers = new Set<string>()

  subscribe(userId: string): void {
    this.subscribers.add(userId)
    console.log(`User ${userId} subscribed to notifications via WebSocket`)
  }

  unsubscribe(userId: string): void {
    this.subscribers.delete(userId)
    console.log(`User ${userId} unsubscribed from notifications`)
  }

  getActiveSubscribers(): string[] {
    return Array.from(this.subscribers)
  }

  getSubscriberCount(): number {
    return this.subscribers.size
  }

  isSubscribed(userId: string): boolean {
    return this.subscribers.has(userId)
  }
}

export class NotificationInfrastructureAdapter implements NotificationPort {
  private subscriptionManager = new SubscriptionManager()

  get subscriptions(): NotificationSubscriptionManager {
    return this.subscriptionManager
  }

  async create(userId: string, payload: NotificationPayload): Promise<Notification> {
    const [savedNotification] = await db
      .insert(notification)
      .values({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ? JSON.stringify(payload.data) : null,
      })
      .returning()

    return savedNotification
  }

  async getUserNotifications(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<NotificationWithParsedData[]> {
    const notifications = await db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset)

    return notifications.map((n) => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null,
    }))
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          eq(notification.isRead, false),
          eq(notification.isArchived, false)
        )
      )

    return result[0]?.count || 0
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const [updatedNotification] = await db
      .update(notification)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
      .returning()

    if (!updatedNotification) {
      return null
    }

    return {
      ...updatedNotification,
      data: updatedNotification.data ? JSON.parse(updatedNotification.data) : null,
    }
  }

  async markAsUnread(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const [updatedNotification] = await db
      .update(notification)
      .set({
        isRead: false,
        readAt: null,
      })
      .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
      .returning()

    if (!updatedNotification) {
      return null
    }

    return {
      ...updatedNotification,
      data: updatedNotification.data ? JSON.parse(updatedNotification.data) : null,
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    const [countResult] = await db
      .select({ count: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)))

    await db
      .update(notification)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)))

    return countResult?.count || 0
  }

  async archiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const [updatedNotification] = await db
      .update(notification)
      .set({
        isArchived: true,
      })
      .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
      .returning()

    if (!updatedNotification) {
      return null
    }

    return {
      ...updatedNotification,
      data: updatedNotification.data ? JSON.parse(updatedNotification.data) : null,
    }
  }

  async unarchiveNotification(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithParsedData | null> {
    const [updatedNotification] = await db
      .update(notification)
      .set({
        isArchived: false,
      })
      .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
      .returning()

    if (!updatedNotification) {
      return null
    }

    return {
      ...updatedNotification,
      data: updatedNotification.data ? JSON.parse(updatedNotification.data) : null,
    }
  }

  async archiveAll(userId: string): Promise<number> {
    const [countResult] = await db
      .select({ count: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), eq(notification.isArchived, false)))

    await db
      .update(notification)
      .set({
        isArchived: true,
      })
      .where(and(eq(notification.userId, userId), eq(notification.isArchived, false)))

    return countResult?.count || 0
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<NotificationSendResult> {
    const savedNotification = await this.create(userId, payload)
    const isSubscribed = this.subscriptionManager.isSubscribed(userId)

    const sent =
      isSubscribed &&
      sendToUser(userId, {
        type: 'notification:new',
        notificationId: savedNotification.id,
        notificationType: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        createdAt: savedNotification.createdAt.toISOString(),
        isRead: savedNotification.isRead,
        isArchived: savedNotification.isArchived,
        timestamp: new Date().toISOString(),
      })

    return {
      saved: true,
      sent: !!sent,
      notificationId: savedNotification.id,
    }
  }

  async sendToMultipleUsers(
    userIds: string[],
    notificationPayload: NotificationPayload
  ): Promise<NotificationBatchResult> {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, { ...notificationPayload, userId }))
    )

    return results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled' && result.value) {
          acc.success++
        } else {
          acc.failed++
        }
        return acc
      },
      { success: 0, failed: 0 }
    )
  }

  async notifyNewMessage(
    userId: string,
    messageData: MessageNotificationData
  ): Promise<NotificationSendResult> {
    const payload = buildMessageNotificationPayload(userId, messageData)
    return await this.sendToUser(userId, payload)
  }

  async notifyRequestUpdate(
    userId: string,
    requestData: RequestNotificationData
  ): Promise<NotificationSendResult> {
    const payload = buildRequestUpdateNotificationPayload(userId, requestData)
    return await this.sendToUser(userId, payload)
  }

  async notifySystemMessage(
    userId: string,
    systemData: SystemNotificationData
  ): Promise<NotificationSendResult> {
    const payload = buildSystemNotificationPayload(userId, systemData)
    return await this.sendToUser(userId, payload)
  }
}
