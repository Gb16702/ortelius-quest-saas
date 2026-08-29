import type { Message } from '../../domain/messaging.types'

export interface TeamChatRepositoryPort {
  getTeamChatId(organizationId: string): Promise<string | null>
  getUserName(userId: string): Promise<string | null>
}

export interface TeamChatMessagePort {
  createSystemMessage(input: {
    conversationId: string
    senderId: string
    content: string
    metadata?: Record<string, unknown>
  }): Promise<Message>
}
