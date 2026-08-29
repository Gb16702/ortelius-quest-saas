export type AssistantMessageRole = 'user' | 'assistant'
export type AssistantActionType = 'open_page'
export type AssistantActionStatus = 'proposed' | 'executed' | 'cancelled' | 'expired' | 'failed'
export type AssistantActionRiskLevel = 'low' | 'medium' | 'high' | 'destructive'
export type AssistantSyncOperation = 'insert' | 'update' | 'delete'
export type AssistantSyncModelName =
  | 'assistant_conversation'
  | 'assistant_message'
  | 'assistant_part'
  | 'assistant_action'
  | 'assistant_run'

export interface AssistantConversation {
  id: string
  userId: string
  organizationId: string | null
  title: string
  lastRoutePath: string | null
  summary: string | null
  summaryMessageCount: number
  summaryTokenEstimate: number
  summaryUpdatedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AssistantMessage {
  id: string
  conversationId: string
  role: AssistantMessageRole
  content: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface AssistantAttachment {
  id: string
  userId: string
  organizationId: string | null
  conversationId: string | null
  messageId: string | null
  filename: string
  originalName: string
  size: number
  mimeType: string
  s3Key: string
  url?: string
  downloadUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface AssistantAction {
  id: string
  conversationId: string | null
  userId: string
  organizationId: string | null
  type: AssistantActionType
  status: AssistantActionStatus
  title: string
  summary: string
  buttonLabel: string
  riskLevel: AssistantActionRiskLevel
  requiresConfirmation: boolean
  payload: Record<string, unknown>
  preview: Record<string, unknown> | null
  result: Record<string, unknown> | null
  errorMessage: string | null
  expiresAt: Date
  confirmedAt: Date | null
  executedAt: Date | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AssistantSyncAction {
  syncId: number
  userId: string
  organizationId: string | null
  conversationId: string
  modelName: AssistantSyncModelName
  modelId: string
  operation: AssistantSyncOperation
  payload: Record<string, unknown>
  createdAt: Date
}
