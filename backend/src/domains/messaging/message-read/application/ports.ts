import type {
  MessageReadConversationAccess,
  MessageReadMessageRecord,
  MessageReadNotification,
  MessageReadReaderProfile,
  MessageReadStatusRow,
} from './message-read-models'

export interface MessageReadRepositoryPort {
  getMessage(messageId: string): Promise<MessageReadMessageRecord | null>
  getConversationAccess(
    conversationId: string,
    userId: string
  ): Promise<MessageReadConversationAccess | null>
  hasMessageRead(messageId: string, userId: string): Promise<boolean>
  insertMessageRead(messageId: string, userId: string): Promise<void>
  insertMessageReads(entries: Array<{ messageId: string; userId: string }>): Promise<void>
  getUnreadMessagesForConversation(
    conversationId: string,
    userId: string
  ): Promise<Array<{ id: string }>>
  getMessagesByIds(messageIds: string[]): Promise<MessageReadMessageRecord[]>
  getReaderInfo(userId: string): Promise<MessageReadReaderProfile | null>
  getConversationReadStatusRows(conversationId: string): Promise<MessageReadStatusRow[]>
}

export interface MessageReadNotificationPort {
  sendToUser(userId: string, notification: MessageReadNotification): void
}

export interface MessageReadClockPort {
  now(): Date
}
