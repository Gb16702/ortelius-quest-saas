import { notificationApplicationService } from '../../notifications/notifications.application'
import type {
  RequestInAppNotificationAdapterPort,
  RequestUpdateNotification,
} from './request-notification.types'

export class RequestInAppNotificationAdapter implements RequestInAppNotificationAdapterPort {
  async notifyRequestUpdate(userId: string, data: RequestUpdateNotification): Promise<void> {
    await notificationApplicationService.notifyRequestUpdate(userId, data)
  }
}
