export interface ReaderInfo {
  userId: string
  userName: string
  userImage: string | null
  readAt: Date
}

export interface MessageReadStatus {
  messageId: string
  seenStatus: 'sent' | 'seen'
  readBy: ReaderInfo[]
}

export interface MessageReadConversationAccess {
  organizationId: string
  requesterId: string | null
  isRequester: boolean
  isOrgMember: boolean
}

export interface MessageReadMessageRecord {
  id: string
  senderId: string
  conversationId: string
}

export interface MessageReadReaderProfile {
  userId: string
  userName: string | null
  userImage: string | null
}

export interface MessageReadStatusRow {
  messageId: string
  senderId: string
  createdAt: Date
  readAt: Date | null
  readByUserId: string | null
  readByUserName: string | null
  readByUserImage: string | null
}

export interface MessageReadNotification extends Record<string, unknown> {
  type: 'message_read'
  data: {
    messageId: string
    readBy: string
    conversationId: string
    readerInfo: MessageReadReaderProfile | null
  }
  timestamp: string
}
