import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  ArchiveNotificationUseCase,
  CreateNotificationUseCase,
  GetUnreadNotificationCountUseCase,
  ListUserNotificationsUseCase,
  MarkNotificationReadStateUseCase,
  SendNotificationUseCase,
} from '../application/notification-use-cases'

const notification = {
  id: 'notification-1',
  userId: 'user-123',
  type: 'system',
  title: 'Title',
  message: 'Message',
  data: null,
  isRead: false,
  isArchived: false,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  readAt: null,
}

const subscriptions = {
  subscribe: mock(() => undefined),
  unsubscribe: mock(() => undefined),
  getActiveSubscribers: mock(() => []),
  getSubscriberCount: mock(() => 0),
  isSubscribed: mock(() => false),
}

const notifications = {
  subscriptions,
  create: mock(() => Promise.resolve(notification)),
  getUserNotifications: mock(() => Promise.resolve([{ ...notification, data: null }])),
  getUnreadCount: mock(() => Promise.resolve(3)),
  markAsRead: mock(() => Promise.resolve({ ...notification, isRead: true, data: null })),
  markAsUnread: mock(() => Promise.resolve({ ...notification, isRead: false, data: null })),
  markAllAsRead: mock(() => Promise.resolve(2)),
  archiveNotification: mock(() =>
    Promise.resolve({ ...notification, isArchived: true, data: null })
  ),
  unarchiveNotification: mock(() =>
    Promise.resolve({ ...notification, isArchived: false, data: null })
  ),
  archiveAll: mock(() => Promise.resolve(4)),
  sendToUser: mock(() => Promise.resolve({ saved: true, sent: false, notificationId: 'n-1' })),
  sendToMultipleUsers: mock(() => Promise.resolve({ success: 2, failed: 0 })),
  notifyNewMessage: mock(() => Promise.resolve({ saved: true, sent: true, notificationId: 'n-2' })),
  notifyRequestUpdate: mock(() =>
    Promise.resolve({ saved: true, sent: true, notificationId: 'n-3' })
  ),
  notifySystemMessage: mock(() =>
    Promise.resolve({ saved: true, sent: false, notificationId: 'n-4' })
  ),
}

describe('Notification use cases', () => {
  beforeEach(() => {
    Object.entries(notifications).forEach(([, value]) => {
      if (typeof value === 'function') value.mockClear()
    })
  })

  it('creates and lists notifications through the port', async () => {
    const payload = {
      type: 'system' as const,
      message: 'Message',
      timestamp: '2026-05-01T00:00:00.000Z',
      userId: 'user-123',
    }

    await expect(
      new CreateNotificationUseCase(notifications).execute({ userId: 'user-123', payload })
    ).resolves.toEqual(notification)
    await expect(
      new ListUserNotificationsUseCase(notifications).execute({
        userId: 'user-123',
        limit: 10,
        offset: 5,
      })
    ).resolves.toEqual([{ ...notification, data: null }])

    expect(notifications.create).toHaveBeenCalledWith('user-123', payload)
    expect(notifications.getUserNotifications).toHaveBeenCalledWith('user-123', 10, 5)
  })

  it('reads count, read state, and archive state through the port', async () => {
    await expect(
      new GetUnreadNotificationCountUseCase(notifications).execute({ userId: 'user-123' })
    ).resolves.toBe(3)
    await expect(
      new MarkNotificationReadStateUseCase(notifications).markAsRead({
        notificationId: 'notification-1',
        userId: 'user-123',
      })
    ).resolves.toMatchObject({ isRead: true })
    await expect(
      new ArchiveNotificationUseCase(notifications).archive({
        notificationId: 'notification-1',
        userId: 'user-123',
      })
    ).resolves.toMatchObject({ isArchived: true })

    expect(notifications.getUnreadCount).toHaveBeenCalledWith('user-123')
    expect(notifications.markAsRead).toHaveBeenCalledWith('notification-1', 'user-123')
    expect(notifications.archiveNotification).toHaveBeenCalledWith('notification-1', 'user-123')
  })

  it('sends user, batch, message, request, and system notifications through the port', async () => {
    const useCase = new SendNotificationUseCase(notifications)
    const payload = {
      type: 'system' as const,
      message: 'Message',
      timestamp: '2026-05-01T00:00:00.000Z',
      userId: 'user-123',
    }

    await expect(useCase.sendToUser({ userId: 'user-123', payload })).resolves.toMatchObject({
      saved: true,
    })
    await expect(
      useCase.sendToMultipleUsers({ userIds: ['user-123', 'user-456'], payload })
    ).resolves.toEqual({ success: 2, failed: 0 })
    await expect(
      useCase.notifyRequestUpdate({
        userId: 'user-123',
        data: { requestId: 'request-1', lifecycleStatus: 'open', details: 'Updated' },
      })
    ).resolves.toMatchObject({ notificationId: 'n-3' })

    expect(notifications.sendToUser).toHaveBeenCalledWith('user-123', payload)
    expect(notifications.sendToMultipleUsers).toHaveBeenCalledWith(
      ['user-123', 'user-456'],
      payload
    )
    expect(notifications.notifyRequestUpdate).toHaveBeenCalledWith('user-123', {
      requestId: 'request-1',
      lifecycleStatus: 'open',
      details: 'Updated',
    })
  })
})
