import type { AssistantRealtimeMessage } from '@ortelius/websocket-types'
import { sendToUserReliable } from '../../../infrastructure/messaging/websocket.service'
import type { AssistantRealtimeNotifierPort } from '../application/ports'

export class WebSocketAssistantRealtimeNotifier implements AssistantRealtimeNotifierPort {
  async notifyUser(userId: string, event: AssistantRealtimeMessage): Promise<void> {
    await sendToUserReliable(userId, event)
  }
}

export const assistantRealtimeNotifier = new WebSocketAssistantRealtimeNotifier()
