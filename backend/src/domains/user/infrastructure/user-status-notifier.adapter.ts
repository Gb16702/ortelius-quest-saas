import { sendToUser } from '../../../infrastructure/messaging/websocket.service'
import type { UserStatusNotifierPort } from '../application/ports'

export class WebsocketUserStatusNotifier implements UserStatusNotifierPort {
  notifyStatusUpdated(userId: string, status: string): void {
    sendToUser(userId, {
      type: 'status:updated',
      status,
      timestamp: new Date().toISOString(),
    })
  }
}
