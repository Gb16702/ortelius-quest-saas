export type ConversationType = 'team' | 'member_dm' | 'requester'
export type ConversationSort = 'newest' | 'oldest'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: string
  replyToId?: string | null
  metadata?: Record<string, unknown> | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ReplyToContext {
  id: string
  senderId: string
  senderName: string
  senderImage?: string | null
  content: string
  messageType: string
  createdAt: Date
}

export interface MessageWithSender extends Message {
  senderName: string
  senderImage?: string | null
  organizationName?: string | null
  memberRole?: string | null
  isUnread?: boolean
  replyTo?: ReplyToContext | null
}

export interface Conversation {
  id: string
  name?: string | null
  description?: string | null
  createdBy: string
  requesterId?: string | null
  organizationId: string
  anonymousRequesterId?: string | null
  conversationType?: ConversationType
  isTeamChat: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ConversationParticipant {
  id: string
  conversationId: string
  userId: string
  role: string
  joinedAt: Date
  leftAt?: Date
  isPinned: boolean
  pinnedAt?: Date | null
}

export interface ConversationWithDetails extends Conversation {
  name: string
  lastMessage?: MessageWithSender | null
  messageCount?: number
  participants?: Array<{
    id: string
    name: string
    image?: string | null
  }>
  contextInfo?: {
    type: 'user' | 'organization'
    id: string | null
    name: string
    image?: string | null
    logo?: string | null
  } | null
  joinedAt?: Date | null
  leftAt?: Date | null
  role?: string | null
  isPinned?: boolean
  pinnedAt?: Date | null
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: Date
}

export interface Attachment {
  id: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  s3Key: string
  url?: string
  uploadedAt: string
  uploadedBy: string
}

export interface AttachmentMetadata {
  attachments?: Attachment[]
  requestId?: string
  requestNumber?: string
}

export interface Mention {
  type: 'user' | 'role'
  id: string
  name: string
}

export interface MessageMetadata extends Record<string, unknown> {
  attachments?: Attachment[]
  requestId?: string
  requestNumber?: string
  mentions?: Mention[]
}

export interface SendMessageData {
  conversationId: string
  senderId: string
  content: string
  messageType?: string
  replyToId?: string
  metadata?: MessageMetadata
}

export interface CreateSystemMessageData {
  conversationId: string
  content: string
  senderId: string
  metadata?: Record<string, unknown>
}

export interface AddReactionData {
  messageId: string
  userId: string
  emoji: string
}

export interface MessageRepository {
  sendMessage(data: SendMessageData): Promise<Message>
  getConversationMessages(
    conversationId: string,
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<{ messages: MessageWithSender[]; total: number }>
  addReaction(data: AddReactionData): Promise<MessageReaction>
  removeReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction[]>
  createSystemMessage(data: CreateSystemMessageData): Promise<Message>
}

export interface ConversationRepository {
  getUserConversations(
    userId: string,
    limit?: number,
    offset?: number,
    unreadOnly?: boolean,
    searchQuery?: string,
    conversationType?: ConversationType,
    sort?: ConversationSort
  ): Promise<{ conversations: ConversationWithDetails[]; total: number }>
}

export interface AttachmentUploadRequest {
  conversationId: string
  userId: string
  files: File[]
}

export interface AttachmentUploadResponse {
  success: boolean
  attachments?: Attachment[]
  error?: string
}
