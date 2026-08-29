import { messageApplicationService } from '../../message/message.application'
import type { ConversationAccessPort, ConversationMessagePort } from '../application/ports'

export class MessageServiceConversationMessageAdapter implements ConversationMessagePort {
  getAllConversationMessages(conversationId: string, userId: string) {
    return messageApplicationService.getAllConversationMessages(conversationId, userId)
  }

  searchConversationMessages(conversationId: string, userId: string, query: string) {
    return messageApplicationService.searchConversationMessages(conversationId, userId, query)
  }

  getPinnedMessages(conversationId: string, userId: string) {
    return messageApplicationService.getPinnedMessages(conversationId, userId)
  }
}

export class MessageServiceConversationAccessAdapter implements ConversationAccessPort {
  canAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    return messageApplicationService.canAccessConversation(conversationId, userId)
  }
}
