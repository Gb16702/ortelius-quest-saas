export type {
  MessageReadConversationAccess,
  MessageReadMessageRecord,
  MessageReadNotification,
  MessageReadReaderProfile,
  MessageReadStatus,
  MessageReadStatusRow,
  ReaderInfo,
} from '../domain'

export interface MessageReadData {
  messageId: string
  userId: string
  readAt?: Date
}

export interface ConversationReadData {
  conversationId: string
  userId: string
  markedCount: number
}

export interface ConversationReadStatusResponse {
  readStatuses: import('../domain').MessageReadStatus[]
}
