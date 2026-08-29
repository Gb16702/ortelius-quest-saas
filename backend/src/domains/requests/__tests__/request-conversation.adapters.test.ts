import { describe, expect, it, mock } from 'bun:test'
import type { CreateRequestData, Request } from '../application/request-models'
import type {
  RequestConversationPersistenceAdapterPort,
  RequestConversationQueryAdapterPort,
} from '../infrastructure/request-conversation.types'
import { RequestCreationConversationAdapter } from '../infrastructure/request-creation-conversation.adapter'
import { RequestLinkingConversationAdapter } from '../infrastructure/request-linking-conversation.adapter'
import type { RequestSystemMessageAdapterPort } from '../infrastructure/request-system-message.types'

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    requesterId: 'requester-user',
    receiverOrganizationId: 'org-1',
    fromDate: new Date('2026-05-08T00:00:00.000Z'),
    toDate: new Date('2026-05-09T00:00:00.000Z'),
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    ...overrides,
  }
}

function makeCreateData(overrides: Partial<CreateRequestData> = {}): CreateRequestData {
  return {
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    requesterId: 'requester-user',
    receiverOrganizationId: 'org-1',
    fromDate: new Date('2026-05-08T00:00:00.000Z'),
    toDate: new Date('2026-05-09T00:00:00.000Z'),
    ...overrides,
  }
}

function createQueries(
  overrides: Partial<RequestConversationQueryAdapterPort> = {}
): RequestConversationQueryAdapterPort {
  return {
    getAnonymousUserByEmail: mock(async () => ({
      id: 'anonymous-1',
      email: 'requester@example.com',
      name: 'Anonymous Requester',
    })),
    getAnonymousUserById: mock(async () => ({
      id: 'anonymous-1',
      email: 'requester@example.com',
      name: 'Anonymous Requester',
    })),
    getConversation: mock(async () => null),
    getFirstOrganizationMember: mock(async () => ({ userId: 'org-admin' })),
    getOrganization: mock(async () => ({ id: 'org-1', name: 'Receiver Org' })),
    getOrganizationMembers: mock(async () => [{ userId: 'org-admin' }, { userId: 'org-member' }]),
    getUser: mock(async () => ({ id: 'requester-user', name: 'Requester User' })),
    findConversationByAnonymousRequester: mock(async () => null),
    findConversationByRequester: mock(async () => null),
    resolveUserName: mock(async (_userId: string, fallback: string) => fallback),
    ...overrides,
  }
}

function createPersistence(
  overrides: Partial<RequestConversationPersistenceAdapterPort> = {}
): RequestConversationPersistenceAdapterPort {
  return {
    addParticipants: mock(async () => undefined),
    createAnonymousUser: mock(async () => ({
      id: 'anonymous-1',
      email: 'requester@example.com',
      name: 'Anonymous Requester',
    })),
    createConversation: mock(async () => 'conversation-new'),
    deleteConversation: mock(async () => undefined),
    ensureParticipant: mock(async () => undefined),
    updateConversationRequester: mock(async () => undefined),
    ...overrides,
  }
}

function createSystemMessages(): RequestSystemMessageAdapterPort {
  return {
    createSystemMessage: mock(async () => undefined),
  }
}

describe('RequestCreationConversationAdapter', () => {
  it('creates an authenticated request conversation through query and persistence ports', async () => {
    const queries = createQueries()
    const persistence = createPersistence()
    const systemMessages = createSystemMessages()
    const adapter = new RequestCreationConversationAdapter(queries, persistence, systemMessages)

    const conversationId = await adapter.resolveCreatedRequestConversation({
      request: makeRequest(),
      createData: makeCreateData(),
    })

    expect(conversationId).toBe('conversation-new')
    expect(persistence.createConversation).toHaveBeenCalledWith({
      name: 'Request REQ-123 - Requester User & Receiver Org',
      description: 'Conversation for request REQ-123',
      createdBy: 'requester-user',
      organizationId: 'org-1',
      requesterId: 'requester-user',
    })
    expect(persistence.addParticipants).toHaveBeenCalledWith([
      { conversationId: 'conversation-new', userId: 'requester-user', role: 'member' },
      { conversationId: 'conversation-new', userId: 'org-admin', role: 'member' },
      { conversationId: 'conversation-new', userId: 'org-member', role: 'member' },
    ])
    expect(systemMessages.createSystemMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-new',
      content: 'New request REQ-123 submitted by Requester User to Receiver Org',
      senderId: 'requester-user',
      metadata: {
        requestId: 'req-1',
        requestNumber: 'REQ-123',
        eventType: 'request_submitted',
        systemEventKey: 'requests.event.submitted',
        systemEventParams: {
          requestNumber: 'REQ-123',
          requesterName: 'Requester User',
          organizationName: 'Receiver Org',
        },
      },
    })
  })

  it('reuses an existing anonymous conversation and appends a submitted message', async () => {
    const queries = createQueries({
      findConversationByAnonymousRequester: mock(async () => 'conversation-existing'),
    })
    const persistence = createPersistence()
    const systemMessages = createSystemMessages()
    const adapter = new RequestCreationConversationAdapter(queries, persistence, systemMessages)

    const conversationId = await adapter.resolveCreatedRequestConversation({
      request: makeRequest({ requesterId: null }),
      createData: makeCreateData({ requesterId: undefined, requesterName: 'Guest Requester' }),
    })

    expect(conversationId).toBe('conversation-existing')
    expect(persistence.createConversation).not.toHaveBeenCalled()
    expect(systemMessages.createSystemMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-existing',
      content: 'New request REQ-123 submitted by Guest Requester to Receiver Org',
      senderId: 'org-admin',
      metadata: {
        requestId: 'req-1',
        requestNumber: 'REQ-123',
        eventType: 'request_submitted',
        systemEventKey: 'requests.event.submitted',
        systemEventParams: {
          requestNumber: 'REQ-123',
          requesterName: 'Guest Requester',
          organizationName: 'Receiver Org',
        },
      },
    })
  })
})

describe('RequestLinkingConversationAdapter', () => {
  it('converts the request conversation from anonymous requester to authenticated user', async () => {
    const queries = createQueries({
      getConversation: mock(async () => ({
        id: 'conversation-existing',
        anonymousRequesterId: 'anonymous-1',
      })),
      resolveUserName: mock(async () => 'Requester User'),
    })
    const persistence = createPersistence()
    const systemMessages = createSystemMessages()
    const adapter = new RequestLinkingConversationAdapter(queries, persistence, systemMessages)

    const conversationId = await adapter.resolveLinkedRequestConversation({
      request: makeRequest({ conversationId: 'conversation-existing' }),
      userEmail: 'requester@example.com',
      userId: 'requester-user',
    })

    expect(conversationId).toBe('conversation-existing')
    expect(persistence.updateConversationRequester).toHaveBeenCalledWith(
      'conversation-existing',
      'requester-user'
    )
    expect(persistence.ensureParticipant).toHaveBeenCalledWith(
      'conversation-existing',
      'requester-user'
    )
    expect(systemMessages.createSystemMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-existing',
      content: 'Requester User has created an account',
      senderId: 'requester-user',
      metadata: {
        systemEventKey: 'requests.event.accountCreated',
        systemEventParams: {
          userName: 'Requester User',
        },
      },
    })
  })

  it('merges into an existing authenticated conversation when linking anonymous requests', async () => {
    const queries = createQueries({
      findConversationByRequester: mock(async () => 'conversation-auth'),
      getConversation: mock(async () => ({
        id: 'conversation-anonymous',
        anonymousRequesterId: 'anonymous-1',
      })),
      resolveUserName: mock(async () => 'Requester User'),
    })
    const persistence = createPersistence()
    const systemMessages = createSystemMessages()
    const adapter = new RequestLinkingConversationAdapter(queries, persistence, systemMessages)

    const conversationId = await adapter.resolveLinkedRequestConversation({
      request: makeRequest({ conversationId: 'conversation-anonymous' }),
      userEmail: 'requester@example.com',
      userId: 'requester-user',
    })

    expect(conversationId).toBe('conversation-auth')
    expect(persistence.deleteConversation).toHaveBeenCalledWith('conversation-anonymous')
    expect(persistence.updateConversationRequester).not.toHaveBeenCalled()
    expect(systemMessages.createSystemMessage).toHaveBeenCalledWith({
      conversationId: 'conversation-auth',
      content: 'Requester User has created an account and their requests have been linked',
      senderId: 'requester-user',
      metadata: {
        systemEventKey: 'requests.event.accountCreatedAndLinked',
        systemEventParams: {
          userName: 'Requester User',
        },
      },
    })
  })
})
