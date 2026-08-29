import { messageApplicationService as messageService } from '../../messaging/message/message.application'
import type { RequestSystemMessageAdapterPort } from './request-system-message.types'

export class RequestSystemMessageAdapter implements RequestSystemMessageAdapterPort {
  async createSystemMessage(data: {
    conversationId: string
    content: string
    senderId: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await messageService.createSystemMessage(data)
  }
}
