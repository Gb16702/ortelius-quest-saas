import type {
  AddReactionData,
  Attachment,
  CreateSystemMessageData,
  Message,
  MessageReaction,
  MessageWithSender,
  SendMessageData,
} from '../../domain/messaging.types'

export interface MessageRepositoryPort {
  sendMessage(data: SendMessageData): Promise<Message>
  getAllConversationMessages(
    conversationId: string,
    userId: string
  ): Promise<{ messages: MessageWithSender[]; total: number }>
  getConversationMessages(
    conversationId: string,
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<{ messages: MessageWithSender[]; total: number }>
  addReaction(data: AddReactionData): Promise<MessageReaction>
  removeReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction[]>
  createSystemMessage(data: CreateSystemMessageData): Promise<Message>
  deleteMessage(messageId: string, userId: string): Promise<{ conversationId: string }>
  editMessage(messageId: string, userId: string, newContent: string): Promise<Message>
  pinMessage(messageId: string, userId: string): Promise<Message>
  unpinMessage(messageId: string, userId: string): Promise<Message>
  getPinnedMessages(conversationId: string, userId: string): Promise<MessageWithSender[]>
  searchConversationMessages(
    conversationId: string,
    userId: string,
    searchQuery: string
  ): Promise<{ messages: MessageWithSender[]; total: number }>
}

export interface MessageAttachmentPort {
  uploadAttachments(input: {
    conversationId: string
    userId: string
    files: File[]
  }): Promise<Attachment[]>
}

export interface MessageBroadcastPort {
  broadcastDeleted(input: { conversationId: string; messageId: string; now: Date }): Promise<void>
  broadcastEdited(input: {
    conversationId: string
    message: Message
    decryptedContent: string
    now: Date
  }): Promise<void>
}

export interface MessageAccessPort {
  canAccessConversation(conversationId: string, userId: string): Promise<boolean>
}
