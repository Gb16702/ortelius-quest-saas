import { conversationApplicationService } from '../../messaging/conversation/conversation.application'
import type { CheckoutConversationPort } from '../application/ports'

export class MessagingCheckoutConversationAdapter implements CheckoutConversationPort {
  async createTeamConversation(organizationId: string, userId: string): Promise<void> {
    await conversationApplicationService.createTeamConversation(organizationId, userId)
  }
}
