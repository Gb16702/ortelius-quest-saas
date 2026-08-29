import type {
  CreateRequestData,
  Request,
  RequestFilters,
  RequestWithRelations,
  UpdateRequestData,
} from './request-models'

export interface RequestRepositoryPort {
  create(data: CreateRequestData): Promise<Request>
  update(id: string, data: UpdateRequestData): Promise<Request>
  attachConversationToRequest(requestId: string, conversationId: string): Promise<void>
  getById(id: string): Promise<Request | null>
  getByIdWithRelations(id: string): Promise<RequestWithRelations | null>
  getByNumber(requestNumber: string): Promise<RequestWithRelations | null>
  getUserRequests(userId: string, filters?: RequestFilters): Promise<Request[]>
  findAnonymousByRequesterEmail(userEmail: string): Promise<Request[]>
  linkAnonymousRequestToUser(
    requestId: string,
    userId: string,
    conversationId: string | null
  ): Promise<void>
  reject(requestId: string, userId: string, reason?: string): Promise<void>
  cancel(requestId: string, userId: string): Promise<void>
  validateDraft(requestId: string, userId: string): Promise<void>
  deleteDraft(requestId: string): Promise<void>
  removeDocument(requestId: string, documentUrl: string): Promise<void>
  assignToMember(requestId: string, assignedToId: string, assignedById: string): Promise<void>
  reassignToMember(requestId: string, assignedToId: string, assignedById: string): Promise<void>
  unassignRequest(requestId: string): Promise<void>
  getAssignedRequests(
    userId: string,
    organizationId: string,
    filters?: RequestFilters
  ): Promise<Request[]>
  getUnassignedRequests(organizationId: string, filters?: RequestFilters): Promise<Request[]>
}

export interface ActivityLogPort {
  logRequestCreated(request: Request, actorId: string): Promise<void>
  logRequestUpdated(request: Request, actorId: string): Promise<void>
  logRequestSharedToTeamChat(request: Request, actorId: string): Promise<void>
  logRequestDeleted(request: Request, actorId: string): Promise<void>
  logRequestRejected(request: Request, actorId: string): Promise<void>
  logRequestCanceled(request: Request, actorId: string): Promise<void>
  logRequestValidated(request: Request, actorId: string): Promise<void>
  logRequestAssigned(
    request: Request,
    assignedToId: string,
    assignedById: string,
    assigneeName?: string
  ): Promise<void>
  logRequestReassigned(request: Request, assignedToId: string, assignedById: string): Promise<void>
  logRequestUnassigned(
    request: Request,
    unassignedById: string,
    previousAssignedToId?: string | null
  ): Promise<void>
}

export interface NotificationPort {
  notifyRequestCreated(request: Request, data: CreateRequestData): Promise<void>
  notifyRequestRejected(request: Request, userId: string, reason?: string): Promise<void>
  notifyRequestCanceled(request: Request, userId: string): Promise<void>
  notifyDraftValidated(request: Request): Promise<void>
  notifyRequestAssigned(request: Request, assignedToId: string, assignedById: string): Promise<void>
  notifyRequestReassigned(
    request: Request,
    assignedToId: string,
    assignedById: string
  ): Promise<void>
  notifyRequestUnassigned(
    request: Request,
    unassignedById: string,
    previousAssignedToId?: string | null
  ): Promise<void>
}

export interface OrganizationMembershipPort {
  hasMembership(userId: string, organizationId: string): Promise<boolean>
}

export interface RequestAssignmentMetricsPort {
  recordAssignedRequest(assignedToId: string, organizationId: string): Promise<void>
}

export interface RequestCreationMetricsPort {
  recordCreatedRequest(organizationId: string): Promise<void>
}

export interface ConversationPort {
  createSystemMessage(data: {
    conversationId: string
    content: string
    senderId: string
    metadata?: Record<string, unknown>
  }): Promise<void>
}

export interface RequestLinkingConversationPort {
  resolveLinkedRequestConversation(data: {
    request: Request
    userEmail: string
    userId: string
  }): Promise<string | null>
}

export interface RequestCreationConversationPort {
  resolveCreatedRequestConversation(data: {
    request: Request
    createData: CreateRequestData
  }): Promise<string | null>
}

export interface RequestTeamChatMessage {
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

export interface RequestTeamChatPort {
  shareRequest(data: {
    organizationId: string
    actorId: string
    requestId: string
    requestNumber: string
  }): Promise<RequestTeamChatMessage | null>
}

export interface RequestOrganizationFilters
  extends Omit<RequestFilters, 'fromDate' | 'organizationId' | 'toDate'> {
  assignedTo?: string | string[]
  fromDate?: string
  priority?: string
  sortOrder?: string
  toDate?: string
}

export interface RequestOrganizationRequestsResult {
  requests: Array<Record<string, unknown>>
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

export interface RequestOrganizationRequestsAggregationResult {
  services: Array<{
    id: string
    name: string
    slug: string
    type: string
    count: number
    percentage: number
  }>
  cargoTypes: Array<{ id: string; name: string; slug: string; count: number; percentage: number }>
}

export interface RequestUserRequestsResult {
  requests: Request[]
  pagination: { total: number }
}

export interface RequestOrganizationQueryPort {
  getUserOrganizations(userId: string): Promise<Array<{ id: string }>>
  getOrganizationRequests(
    organizationId: string,
    userId: string,
    filters?: RequestOrganizationFilters
  ): Promise<RequestOrganizationRequestsResult>
  getRequestsAggregation(
    organizationId: string
  ): Promise<RequestOrganizationRequestsAggregationResult>
  getOrganizationMembers(organizationId: string): Promise<unknown[]>
}

export interface RequestAuthorizationPort {
  canPerformRequestActions(requestId: string, userId: string): Promise<boolean>
  canAssignRequests(organizationId: string, userId: string): Promise<boolean>
  canViewAssignedRequests(requestId: string, userId: string): Promise<boolean>
  getRequestOrganizationId(requestId: string): Promise<string | null>
  resolveAccessibleRequestById(requestId: string, userId: string): Promise<string | null>
  resolveAccessibleRequestByNumber(requestNumber: string, userId: string): Promise<string | null>
}
