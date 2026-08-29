import { sendToUser } from '../../../../infrastructure/messaging/websocket.service'
import type { MessageReadNotification } from '../application/message-read-models'
import type { MessageReadNotificationPort } from '../application/ports'

export class WebsocketMessageReadNotificationAdapter implements MessageReadNotificationPort {
  sendToUser(userId: string, notification: MessageReadNotification): void {
    sendToUser(userId, notification)
  }
}
