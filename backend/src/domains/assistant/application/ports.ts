import type { AssistantRealtimeMessage } from '@ortelius/websocket-types'
import type {
  AssistantAction,
  AssistantActionRiskLevel,
  AssistantActionStatus,
  AssistantActionType,
  AssistantAttachment,
  AssistantConversation,
  AssistantMessage,
  AssistantMessageRole,
  AssistantSyncAction,
  AssistantSyncModelName,
  AssistantSyncOperation,
} from './assistant-models'

export interface CreateAssistantConversationInput {
  id?: string
  userId: string
  organizationId?: string
  title: string
  lastRoutePath?: string
}

export interface CreateAssistantMessageInput {
  id?: string
  conversationId: string
  role: AssistantMessageRole
  content: string
  metadata?: Record<string, unknown>
}

export interface CreateAssistantActionInput {
  conversationId?: string
  userId: string
  organizationId?: string
  type: AssistantActionType
  title: string
  summary: string
  buttonLabel: string
  riskLevel: AssistantActionRiskLevel
  requiresConfirmation: boolean
  payload: Record<string, unknown>
  preview?: Record<string, unknown>
  expiresAt: Date
}

export interface CreateAssistantAttachmentInput {
  userId: string
  organizationId?: string | null
  conversationId?: string | null
  messageId?: string | null
  filename: string
  originalName: string
  size: number
  mimeType: string
  s3Key: string
}

export interface CreateAssistantSyncActionInput {
  userId: string
  organizationId?: string | null
  conversationId: string
  modelName: AssistantSyncModelName
  modelId: string
  operation: AssistantSyncOperation
  payload: Record<string, unknown>
}

export interface ListAssistantAttachmentsInput {
  userId: string
  limit: number
  cursor?: string
  search?: string
}

export interface ListAssistantAttachmentsResult {
  attachments: AssistantAttachment[]
  nextCursor: string | null
}

export interface AttachAssistantAttachmentsToMessageInput {
  userId: string
  attachmentIds: string[]
  conversationId: string
  messageId: string
}

export interface UpdateAssistantActionInput {
  actionId: string
  userId: string
  status: AssistantActionStatus
  result?: Record<string, unknown>
  errorMessage?: string
  confirmedAt?: Date
  executedAt?: Date
  cancelledAt?: Date
}

export interface UpdateAssistantConversationSummaryInput {
  conversationId: string
  summary: string
  summaryMessageCount: number
  summaryTokenEstimate: number
  summaryUpdatedAt?: Date
}

export interface UpdateAssistantConversationTitleInput {
  conversationId: string
  title: string
  updatedAt?: Date
}

export interface SoftDeleteAssistantConversationInput {
  conversationId: string
  userId: string
  deletedAt?: Date
}

export interface SoftDeleteAssistantConversationResult {
  conversation: AssistantConversation
  deletedAt: Date
  alreadyDeleted: boolean
}

export interface ListAssistantSyncActionsResult {
  firstSyncId: number
  lastSyncId: number
  hasMore: boolean
  actions: AssistantSyncAction[]
}

export interface AssistantMessageWithConversation {
  message: AssistantMessage
  conversation: AssistantConversation
}

export interface AssistantOrganizationContext {
  organization: {
    id: string
    name: string
    slug: string | null
    status: string
    tagline: string | null
  }
  membership: {
    role: string
  }
  subscription: {
    plan: string
    status: string
    periodEnd: Date | null
    trialEnd: Date | null
    cancelAtPeriodEnd: boolean | null
  } | null
  usage: {
    memberCount: number
    pendingInvitationCount: number
  }
}

export interface AssistantRepositoryPort {
  createConversation(input: CreateAssistantConversationInput): Promise<AssistantConversation>
  findConversationForUser(
    conversationId: string,
    userId: string
  ): Promise<AssistantConversation | null>
  countMessages(conversationId: string): Promise<number>
  listMessagesAfterOffset(
    conversationId: string,
    offset: number,
    limit: number
  ): Promise<AssistantMessage[]>
  listMessages(conversationId: string, limit: number): Promise<AssistantMessage[]>
  findMessageWithConversationForUser(
    messageId: string,
    userId: string
  ): Promise<AssistantMessageWithConversation | null>
  createMessage(input: CreateAssistantMessageInput): Promise<AssistantMessage>
  createAttachments(input: CreateAssistantAttachmentInput[]): Promise<AssistantAttachment[]>
  findAttachmentsForUser(input: {
    userId: string
    attachmentIds: string[]
  }): Promise<AssistantAttachment[]>
  listRecentAttachmentsForUser(input: {
    userId: string
    limit: number
  }): Promise<AssistantAttachment[]>
  listAttachmentsForUser(
    input: ListAssistantAttachmentsInput
  ): Promise<ListAssistantAttachmentsResult>
  attachAttachmentsToMessage(
    input: AttachAssistantAttachmentsToMessageInput
  ): Promise<AssistantAttachment[]>
  updateConversationSummary(
    input: UpdateAssistantConversationSummaryInput
  ): Promise<AssistantConversation | null>
  updateConversationTitle(
    input: UpdateAssistantConversationTitleInput
  ): Promise<AssistantConversation | null>
  softDeleteConversationForUser(
    input: SoftDeleteAssistantConversationInput
  ): Promise<SoftDeleteAssistantConversationResult | null>
  createSyncAction(input: CreateAssistantSyncActionInput): Promise<AssistantSyncAction>
  getLastSyncIdForUser(userId: string): Promise<number>
  listSyncActionsForUser(input: {
    userId: string
    after: number
    limit: number
  }): Promise<ListAssistantSyncActionsResult>
  createAction(input: CreateAssistantActionInput): Promise<AssistantAction>
  findActionForUser(actionId: string, userId: string): Promise<AssistantAction | null>
  updateAction(input: UpdateAssistantActionInput): Promise<AssistantAction | null>
  userCanAccessOrganization(userId: string, organizationId: string): Promise<boolean>
  getOrganizationContextForUser(
    userId: string,
    organizationId: string
  ): Promise<AssistantOrganizationContext | null>
  touchConversation(input: {
    conversationId: string
    lastRoutePath?: string
    updatedAt?: Date
  }): Promise<void>
}

export interface AssistantRealtimeNotifierPort {
  notifyUser(userId: string, event: AssistantRealtimeMessage): Promise<void> | void
}
