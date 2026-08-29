import type {
  AddReactionData,
  CreateSystemMessageData,
  Message,
  SendMessageData,
} from '../domain/messaging.types'

async function getRepository() {
  return import('./infrastructure/message.repository')
}

async function getUseCases() {
  const { getMessageUseCases } = await import('./infrastructure/message-use-cases')
  return getMessageUseCases()
}

export class MessageApplicationService {
  async canAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    const { canAccessConversation } = await getRepository()
    return canAccessConversation(conversationId, userId)
  }

  async populateAttachmentUrls(metadata: Record<string, unknown> | null) {
    const { populateAttachmentUrls } = await getRepository()
    return populateAttachmentUrls(metadata)
  }

  async uploadAttachments(input: { conversationId: string; userId: string; files: File[] }) {
    const useCases = await getUseCases()
    return useCases.uploadAttachments.execute(input)
  }

  async sendMessage(data: SendMessageData) {
    const useCases = await getUseCases()
    const { decryptMessageContent, populateAttachmentUrls } = await getRepository()
    const newMessage = await useCases.sendMessage.execute(data)

    return {
      ...newMessage,
      content: decryptMessageContent(newMessage.content),
      metadata: await populateAttachmentUrls(newMessage.metadata as Record<string, unknown> | null),
    }
  }

  async getAllConversationMessages(conversationId: string, userId: string) {
    const { messageRepository } = await getRepository()
    return messageRepository.getAllConversationMessages(conversationId, userId)
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit?: number,
    offset?: number
  ) {
    const { messageRepository } = await getRepository()
    return messageRepository.getConversationMessages(conversationId, userId, limit, offset)
  }

  async searchConversationMessages(conversationId: string, userId: string, query: string) {
    const { messageRepository } = await getRepository()
    return messageRepository.searchConversationMessages(conversationId, userId, query)
  }

  async getPinnedMessages(conversationId: string, userId: string) {
    const { messageRepository } = await getRepository()
    return messageRepository.getPinnedMessages(conversationId, userId)
  }

  async addReaction(data: AddReactionData) {
    const { messageRepository } = await getRepository()
    return messageRepository.addReaction(data)
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const { messageRepository } = await getRepository()
    return messageRepository.removeReaction(messageId, userId, emoji)
  }

  async createSystemMessage(data: CreateSystemMessageData): Promise<Message> {
    const { messageRepository } = await getRepository()
    return messageRepository.createSystemMessage(data)
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const useCases = await getUseCases()
    return useCases.deleteMessage.execute({ messageId, userId })
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const useCases = await getUseCases()
    return useCases.editMessage.execute({ messageId, userId, content })
  }

  async pinMessage(messageId: string, userId: string) {
    const { messageRepository } = await getRepository()
    return messageRepository.pinMessage(messageId, userId)
  }

  async unpinMessage(messageId: string, userId: string) {
    const { messageRepository } = await getRepository()
    return messageRepository.unpinMessage(messageId, userId)
  }
}

export const messageApplicationService = new MessageApplicationService()
