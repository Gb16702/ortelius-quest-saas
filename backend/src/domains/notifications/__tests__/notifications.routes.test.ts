import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono, type MiddlewareHandler } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { NotificationWithParsedData } from '../application/notification-models'

const testUser = { id: 'user-123', email: 'test@example.com' }

const mockNotificationApplicationService = {
  getUserNotifications: mock((): Promise<NotificationWithParsedData[]> => Promise.resolve([])),
  getUnreadCount: mock((): Promise<number> => Promise.resolve(0)),
  markAsRead: mock((): Promise<NotificationWithParsedData | null> => Promise.resolve(null)),
  markAsUnread: mock((): Promise<NotificationWithParsedData | null> => Promise.resolve(null)),
  markAllAsRead: mock((): Promise<number> => Promise.resolve(0)),
  archiveNotification: mock(
    (): Promise<NotificationWithParsedData | null> => Promise.resolve(null)
  ),
  unarchiveNotification: mock(
    (): Promise<NotificationWithParsedData | null> => Promise.resolve(null)
  ),
  archiveAll: mock((): Promise<number> => Promise.resolve(0)),
}

const { createNotificationsRoutes } = await import('../presentation/notifications.routes')

function createAuthMiddleware(
  authenticated: boolean
): MiddlewareHandler<{ Variables: CommonVariables }> {
  return async (c, next) => {
    if (!authenticated) {
      return c.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required' },
        401
      )
    }

    c.set('user', testUser)
    await next()
  }
}

function makeNotification(
  overrides: Partial<NotificationWithParsedData> = {}
): NotificationWithParsedData {
  return {
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
    ...overrides,
  }
}

function createApp(authenticated = true) {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route(
    '/notifications',
    createNotificationsRoutes(
      mockNotificationApplicationService,
      createAuthMiddleware(authenticated)
    )
  )
  return app
}

describe('Notifications Routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = createApp()
    Object.values(mockNotificationApplicationService).forEach((mockFn) => mockFn.mockReset())
    mockNotificationApplicationService.getUserNotifications.mockResolvedValue([
      makeNotification({ id: 'notification-1' }),
    ])
    mockNotificationApplicationService.getUnreadCount.mockResolvedValue(2)
    mockNotificationApplicationService.markAsRead.mockResolvedValue(
      makeNotification({ isRead: true })
    )
    mockNotificationApplicationService.markAsUnread.mockResolvedValue(makeNotification())
    mockNotificationApplicationService.markAllAsRead.mockResolvedValue(2)
    mockNotificationApplicationService.archiveNotification.mockResolvedValue(
      makeNotification({ isArchived: true })
    )
    mockNotificationApplicationService.unarchiveNotification.mockResolvedValue(makeNotification())
    mockNotificationApplicationService.archiveAll.mockResolvedValue(3)
  })

  it('requires authentication', async () => {
    const response = await createApp(false).request('/notifications')

    expect(response.status).toBe(401)
  })

  it('returns notifications with unread count and pagination', async () => {
    const response = await app.request('/notifications?limit=10&offset=5')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject({
      unreadCount: 2,
      pagination: { limit: 10, offset: 5, hasMore: false },
    })
    expect(mockNotificationApplicationService.getUserNotifications).toHaveBeenCalledWith(
      'user-123',
      10,
      5
    )
  })

  it('returns unread count', async () => {
    const response = await app.request('/notifications/unread-count')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data).toEqual({ count: 2 })
    expect(mockNotificationApplicationService.getUnreadCount).toHaveBeenCalledWith('user-123')
  })

  it('marks notifications as read and unread', async () => {
    const readResponse = await app.request('/notifications/notification-1/read', {
      method: 'PATCH',
    })
    const unreadResponse = await app.request('/notifications/notification-1/unread', {
      method: 'PATCH',
    })

    expect(readResponse.status).toBe(200)
    expect(unreadResponse.status).toBe(200)
    expect(mockNotificationApplicationService.markAsRead).toHaveBeenCalledWith(
      'notification-1',
      'user-123'
    )
    expect(mockNotificationApplicationService.markAsUnread).toHaveBeenCalledWith(
      'notification-1',
      'user-123'
    )
  })

  it('preserves not found responses for missing notifications', async () => {
    mockNotificationApplicationService.markAsRead.mockResolvedValue(null)

    const response = await app.request('/notifications/missing/read', { method: 'PATCH' })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.code).toBe('NOT_FOUND')
    expect(json.message).toBe('Notification not found')
  })

  it('marks all read and archives notifications', async () => {
    const markAllResponse = await app.request('/notifications/mark-all-read', { method: 'PATCH' })
    const archiveResponse = await app.request('/notifications/notification-1/archive', {
      method: 'PATCH',
    })
    const unarchiveResponse = await app.request('/notifications/notification-1/unarchive', {
      method: 'PATCH',
    })
    const archiveAllResponse = await app.request('/notifications/archive-all', { method: 'PATCH' })

    expect(markAllResponse.status).toBe(200)
    expect(archiveResponse.status).toBe(200)
    expect(unarchiveResponse.status).toBe(200)
    expect(archiveAllResponse.status).toBe(200)
    expect(mockNotificationApplicationService.markAllAsRead).toHaveBeenCalledWith('user-123')
    expect(mockNotificationApplicationService.archiveNotification).toHaveBeenCalledWith(
      'notification-1',
      'user-123'
    )
    expect(mockNotificationApplicationService.unarchiveNotification).toHaveBeenCalledWith(
      'notification-1',
      'user-123'
    )
    expect(mockNotificationApplicationService.archiveAll).toHaveBeenCalledWith('user-123')
  })
})
