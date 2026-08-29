import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateParam, validateQuery } from '../../../infrastructure/validation/validation.utils'
import { notificationApplicationService } from '../notifications.application'
import { notificationIdParamSchema, notificationQuerySchema } from './notifications.schemas'

type NotificationsRouteService = Pick<
  typeof notificationApplicationService,
  | 'getUserNotifications'
  | 'getUnreadCount'
  | 'markAsRead'
  | 'markAsUnread'
  | 'markAllAsRead'
  | 'archiveNotification'
  | 'unarchiveNotification'
  | 'archiveAll'
>
type NotificationsAuthMiddleware = MiddlewareHandler<{ Variables: CommonVariables }>

export function createNotificationsRoutes(
  notificationService: NotificationsRouteService = notificationApplicationService,
  authMiddleware: NotificationsAuthMiddleware = requireAuthMiddleware
) {
  const notifications = new Hono<{ Variables: CommonVariables }>()

  notifications.get('/', authMiddleware, validateQuery(notificationQuerySchema), async (c) => {
    try {
      const user = c.get('user')!
      const { limit, offset } = c.req.valid('query')

      const [notificationsList, unreadCount] = await Promise.all([
        notificationService.getUserNotifications(user.id, limit, offset),
        notificationService.getUnreadCount(user.id),
      ])

      const response: ApiResponse = {
        success: true,
        data: {
          notifications: notificationsList,
          unreadCount,
          pagination: {
            limit,
            offset,
            hasMore: notificationsList.length === limit,
          },
        },
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch notifications'
      )
      return c.json(response, 500)
    }
  })

  notifications.get('/unread-count', authMiddleware, async (c) => {
    try {
      const user = c.get('user')!
      const count = await notificationService.getUnreadCount(user.id)

      const response: ApiResponse = {
        success: true,
        data: { count },
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch unread count'
      )
      return c.json(response, 500)
    }
  })

  notifications.patch(
    '/:id/read',
    authMiddleware,
    validateParam(notificationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { id } = c.req.valid('param')

        const updatedNotification = await notificationService.markAsRead(id, user.id)

        if (!updatedNotification) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.NOT_FOUND,
            'Notification not found'
          )
          return c.json(response, 404)
        }

        const response: ApiResponse = {
          success: true,
          data: updatedNotification,
          message: 'Notification marked as read',
        }
        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to mark notification as read'
        )
        return c.json(response, 500)
      }
    }
  )

  notifications.patch(
    '/:id/unread',
    authMiddleware,
    validateParam(notificationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { id } = c.req.valid('param')

        const updatedNotification = await notificationService.markAsUnread(id, user.id)

        if (!updatedNotification) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.NOT_FOUND,
            'Notification not found'
          )
          return c.json(response, 404)
        }

        const response: ApiResponse = {
          success: true,
          data: updatedNotification,
          message: 'Notification marked as unread',
        }
        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to mark notification as unread'
        )
        return c.json(response, 500)
      }
    }
  )

  notifications.patch('/mark-all-read', authMiddleware, async (c) => {
    try {
      const user = c.get('user')!
      const updatedCount = await notificationService.markAllAsRead(user.id)

      const response: ApiResponse = {
        success: true,
        data: { updatedCount },
        message: 'All notifications marked as read',
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to mark all notifications as read'
      )
      return c.json(response, 500)
    }
  })

  notifications.patch(
    '/:id/archive',
    authMiddleware,
    validateParam(notificationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { id } = c.req.valid('param')

        const archivedNotification = await notificationService.archiveNotification(id, user.id)

        if (!archivedNotification) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.NOT_FOUND,
            'Notification not found'
          )
          return c.json(response, 404)
        }

        const response: ApiResponse = {
          success: true,
          data: archivedNotification,
          message: 'Notification archived',
        }
        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to archive notification'
        )
        return c.json(response, 500)
      }
    }
  )

  notifications.patch(
    '/:id/unarchive',
    authMiddleware,
    validateParam(notificationIdParamSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const { id } = c.req.valid('param')

        const unarchivedNotification = await notificationService.unarchiveNotification(id, user.id)

        if (!unarchivedNotification) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.NOT_FOUND,
            'Notification not found'
          )
          return c.json(response, 404)
        }

        const response: ApiResponse = {
          success: true,
          data: unarchivedNotification,
          message: 'Notification unarchived',
        }
        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to unarchive notification'
        )
        return c.json(response, 500)
      }
    }
  )

  notifications.patch('/archive-all', authMiddleware, async (c) => {
    try {
      const user = c.get('user')!
      const archivedCount = await notificationService.archiveAll(user.id)

      const response: ApiResponse = {
        success: true,
        data: { archivedCount },
        message: 'All notifications archived',
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to archive all notifications'
      )
      return c.json(response, 500)
    }
  })

  return notifications
}

export default createNotificationsRoutes()
