import type { ConversationSort, ConversationType } from '../domain/messaging.types'

async function getUseCases() {
  const { getConversationUseCases } = await import('./infrastructure/conversation-use-cases')
  return getConversationUseCases()
}

export class ConversationApplicationService {
  async getUnreadConversationsCount(userId: string) {
    const useCases = await getUseCases()
    return useCases.getUnreadCount.execute({ userId })
  }

  async getUserConversations(
    userId: string,
    limit?: number,
    offset?: number,
    unreadOnly?: boolean,
    searchQuery?: string,
    conversationType?: ConversationType,
    sort?: ConversationSort
  ) {
    const useCases = await getUseCases()
    return useCases.listUserConversations.execute({
      userId,
      limit,
      offset,
      unreadOnly,
      searchQuery,
      conversationType,
      sort,
    })
  }

  async getAllConversationMessages(conversationId: string, userId: string) {
    const useCases = await getUseCases()
    return useCases.getMessages.execute({ conversationId, userId })
  }

  async searchConversationMessages(conversationId: string, userId: string, query: string) {
    const useCases = await getUseCases()
    return useCases.searchMessages.execute({ conversationId, userId, query })
  }

  async getPinnedMessages(conversationId: string, userId: string) {
    const useCases = await getUseCases()
    return useCases.getPinnedMessages.execute({ conversationId, userId })
  }

  async pinConversation(conversationId: string, userId: string) {
    const useCases = await getUseCases()
    return useCases.pin.execute({ conversationId, userId })
  }

  async unpinConversation(conversationId: string, userId: string) {
    const useCases = await getUseCases()
    return useCases.unpin.execute({ conversationId, userId })
  }

  async getConversationParticipants(conversationId: string, userId: string) {
    const useCases = await getUseCases()
    return useCases.getParticipants.execute({ conversationId, userId })
  }

  async resolveMemberDmConversation(
    organizationId: string,
    currentUserId: string,
    targetUserId: string
  ) {
    const useCases = await getUseCases()
    return useCases.resolveMemberDm.execute({ organizationId, currentUserId, targetUserId })
  }

  async createTeamConversation(organizationId: string, creatorId: string): Promise<string> {
    const { conversationRepository } = await import('./infrastructure/conversation.repository')
    return conversationRepository.createTeamConversation(organizationId, creatorId)
  }

  async addMemberToTeamChat(organizationId: string, userId: string): Promise<void> {
    const { conversationRepository } = await import('./infrastructure/conversation.repository')
    return conversationRepository.addMemberToTeamChat(organizationId, userId)
  }

  async addMemberToAllOrganizationConversations(
    organizationId: string,
    userId: string
  ): Promise<void> {
    const { conversationRepository } = await import('./infrastructure/conversation.repository')
    return conversationRepository.addMemberToAllOrganizationConversations(organizationId, userId)
  }
}

export const conversationApplicationService = new ConversationApplicationService()
