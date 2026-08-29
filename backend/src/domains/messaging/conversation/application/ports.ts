import type {
  ConversationSort,
  ConversationType,
  ConversationWithDetails,
  MessageWithSender,
} from '../../domain/messaging.types'

export interface ConversationRepositoryPort {
  getUserConversations(
    userId: string,
    limit?: number,
    offset?: number,
    unreadOnly?: boolean,
    searchQuery?: string,
    conversationType?: ConversationType,
    sort?: ConversationSort
  ): Promise<{ conversations: ConversationWithDetails[]; total: number }>
  createTeamConversation(organizationId: string, creatorId: string): Promise<string>
  addMemberToTeamChat(organizationId: string, userId: string): Promise<void>
  addMemberToAllOrganizationConversations(organizationId: string, userId: string): Promise<void>
  pinConversation(conversationId: string, userId: string): Promise<void>
  unpinConversation(conversationId: string, userId: string): Promise<void>
  getUnreadConversationsCount(userId: string): Promise<{ count: number; conversationIds: string[] }>
  resolveMemberDmConversation(input: {
    organizationId: string
    currentUserId: string
    targetUserId: string
  }): Promise<{ conversationId: string; conversationType: 'member_dm' }>
}

export interface ConversationMessagePort {
  getAllConversationMessages(
    conversationId: string,
    userId: string
  ): Promise<{ messages: MessageWithSender[]; total: number }>
  searchConversationMessages(
    conversationId: string,
    userId: string,
    query: string
  ): Promise<{ messages: MessageWithSender[]; total: number }>
  getPinnedMessages(conversationId: string, userId: string): Promise<MessageWithSender[]>
}

export interface ConversationAccessPort {
  canAccessConversation(conversationId: string, userId: string): Promise<boolean>
}

export interface ConversationParticipantPresencePort {
  getConversationParticipants(conversationId: string): Promise<unknown[]>
}
