export type RequestConversationAnonymousRequester = {
  id: string
  email?: string
  name: string
}

export type RequestConversationUser = {
  id: string
  name: string
}

export type RequestConversationOrganization = {
  id: string
  name: string
}

export type RequestConversationMember = {
  userId: string
}

export type RequestConversationRecord = {
  id: string
  anonymousRequesterId: string | null
}

export type RequestConversationParticipant = {
  conversationId: string
  userId: string
  role: string
}

export interface RequestConversationQueryAdapterPort {
  getAnonymousUserByEmail(email: string): Promise<RequestConversationAnonymousRequester | null>
  getAnonymousUserById(id: string): Promise<RequestConversationAnonymousRequester | null>
  getConversation(conversationId: string): Promise<RequestConversationRecord | null>
  getFirstOrganizationMember(organizationId: string): Promise<RequestConversationMember | null>
  getOrganization(organizationId: string): Promise<RequestConversationOrganization | null>
  getOrganizationMembers(organizationId: string): Promise<RequestConversationMember[]>
  getUser(userId: string): Promise<RequestConversationUser | null>
  findConversationByAnonymousRequester(
    anonymousRequesterId: string,
    organizationId: string
  ): Promise<string | null>
  findConversationByRequester(requesterId: string, organizationId: string): Promise<string | null>
  resolveUserName(userId: string, fallback: string): Promise<string>
}

export interface RequestConversationPersistenceAdapterPort {
  addParticipants(participants: RequestConversationParticipant[]): Promise<void>
  createAnonymousUser(data: {
    email: string
    name: string
  }): Promise<RequestConversationAnonymousRequester>
  createConversation(data: {
    anonymousRequesterId?: string | null
    createdBy: string
    description: string
    name: string
    organizationId: string
    requesterId?: string | null
  }): Promise<string>
  deleteConversation(conversationId: string): Promise<void>
  ensureParticipant(conversationId: string, userId: string): Promise<void>
  updateConversationRequester(conversationId: string, requesterId: string): Promise<void>
}
