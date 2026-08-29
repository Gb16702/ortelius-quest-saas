import type { ConversationReadStatusResponse } from './application/message-read-models'

async function getUseCases() {
  const { getMessageReadUseCases } = await import('./infrastructure/message-read-use-cases')
  return getMessageReadUseCases()
}

export class MessageReadApplicationService {
  async markMessageAsRead(messageId: string, userId: string): Promise<{ success: boolean }> {
    const useCases = await getUseCases()
    return useCases.markMessageAsRead.execute({ messageId, userId })
  }

  async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<{ success: boolean; markedCount: number }> {
    const useCases = await getUseCases()
    return useCases.markConversationAsRead.execute({ conversationId, userId })
  }

  async getConversationReadStatuses(
    conversationId: string,
    currentUserId: string
  ): Promise<ConversationReadStatusResponse> {
    const useCases = await getUseCases()
    return useCases.getConversationReadStatuses.execute({ conversationId, currentUserId })
  }
}

export const messageReadApplicationService = new MessageReadApplicationService()
