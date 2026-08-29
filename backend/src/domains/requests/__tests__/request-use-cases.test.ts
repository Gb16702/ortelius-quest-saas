import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type {
  ActivityLogPort,
  NotificationPort,
  OrganizationMembershipPort,
  RequestAssignmentMetricsPort,
  RequestAuthorizationPort,
  RequestCreationConversationPort,
  RequestCreationMetricsPort,
  RequestLinkingConversationPort,
  RequestOrganizationQueryPort,
  RequestRepositoryPort,
  RequestTeamChatMessage,
  RequestTeamChatPort,
} from '../application/ports'
import type {
  CreateRequestData,
  Request,
  RequestWithRelations,
} from '../application/request-models'
import {
  AssignRequestUseCase,
  CancelRequestUseCase,
  CheckRequestActionPermissionUseCase,
  CheckRequestAssignmentPermissionUseCase,
  CheckRequestReceiverMembershipUseCase,
  CheckRequestViewPermissionUseCase,
  CreateRequestUseCase,
  DeleteDraftRequestUseCase,
  GetRequestByIdUseCase,
  GetRequestByNumberUseCase,
  GetRequestOrganizationAggregationUseCase,
  LinkRequestsToUserUseCase,
  ListAccessibleRequestsUseCase,
  ListAssignedRequestsUseCase,
  ListOrganizationRequestsUseCase,
  ListRequestOrganizationMembersUseCase,
  ListUnassignedRequestsUseCase,
  ListUserRequestsUseCase,
  ReassignRequestUseCase,
  RejectRequestUseCase,
  ResolveAccessibleRequestByIdUseCase,
  ResolveAccessibleRequestByNumberUseCase,
  ResolveRequestOrganizationUseCase,
  ShareRequestToTeamChatUseCase,
  UnassignRequestUseCase,
  UpdateRequestUseCase,
  ValidateDraftRequestUseCase,
} from '../application/request-use-cases'

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    requesterId: 'requester-user',
    receiverOrganizationId: 'org-1',
    fromDate: new Date(),
    toDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeRequestWithRelations(
  overrides: Partial<RequestWithRelations> = {}
): RequestWithRelations {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    requesterId: 'requester-user',
    receiverOrganizationId: 'org-1',
    fromDate: new Date(),
    toDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeTeamChatMessage(
  overrides: Partial<RequestTeamChatMessage> = {}
): RequestTeamChatMessage {
  return {
    id: 'message-1',
    conversationId: 'team-chat-1',
    senderId: 'admin-user',
    content: 'Someone shared a request',
    messageType: 'system',
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createRepository(initialRequest: Request | null): RequestRepositoryPort {
  return {
    create: mock(async () => makeRequest()),
    update: mock(async () => initialRequest ?? makeRequest()),
    attachConversationToRequest: mock(async () => undefined),
    getById: mock(async () => initialRequest),
    getByIdWithRelations: mock(async () =>
      initialRequest ? makeRequestWithRelations({ id: initialRequest.id }) : null
    ),
    getByNumber: mock(async () =>
      initialRequest ? makeRequestWithRelations({ id: initialRequest.id }) : null
    ),
    getUserRequests: mock(async () => []),
    findAnonymousByRequesterEmail: mock(async () => (initialRequest ? [initialRequest] : [])),
    linkAnonymousRequestToUser: mock(async () => undefined),
    reject: mock(async () => undefined),
    cancel: mock(async () => undefined),
    validateDraft: mock(async () => undefined),
    deleteDraft: mock(async () => undefined),
    removeDocument: mock(async () => undefined),
    assignToMember: mock(async () => undefined),
    reassignToMember: mock(async () => undefined),
    unassignRequest: mock(async () => undefined),
    getAssignedRequests: mock(async () => []),
    getUnassignedRequests: mock(async () => []),
  }
}

function createActivity(): ActivityLogPort {
  return {
    logRequestCreated: mock(async () => undefined),
    logRequestUpdated: mock(async () => undefined),
    logRequestSharedToTeamChat: mock(async () => undefined),
    logRequestDeleted: mock(async () => undefined),
    logRequestRejected: mock(async () => undefined),
    logRequestCanceled: mock(async () => undefined),
    logRequestValidated: mock(async () => undefined),
    logRequestAssigned: mock(async () => undefined),
    logRequestReassigned: mock(async () => undefined),
    logRequestUnassigned: mock(async () => undefined),
  }
}

function createNotifications(): NotificationPort {
  return {
    notifyRequestCreated: mock(async () => undefined),
    notifyRequestRejected: mock(async () => undefined),
    notifyRequestCanceled: mock(async () => undefined),
    notifyDraftValidated: mock(async () => undefined),
    notifyRequestAssigned: mock(async () => undefined),
    notifyRequestReassigned: mock(async () => undefined),
    notifyRequestUnassigned: mock(async () => undefined),
  }
}

function createAssignmentMetrics(): RequestAssignmentMetricsPort {
  return {
    recordAssignedRequest: mock(async () => undefined),
  }
}

function createCreationMetrics(): RequestCreationMetricsPort {
  return {
    recordCreatedRequest: mock(async () => undefined),
  }
}

function createCreationConversations(): RequestCreationConversationPort {
  return {
    resolveCreatedRequestConversation: mock(async () => 'conversation-1'),
  }
}

function createRequestLinkingConversations(): RequestLinkingConversationPort {
  return {
    resolveLinkedRequestConversation: mock(async () => 'conversation-1'),
  }
}

function createTeamChat(): RequestTeamChatPort {
  return {
    shareRequest: mock(async () => makeTeamChatMessage()),
  }
}

function createOrganizationQueries(): RequestOrganizationQueryPort {
  return {
    getUserOrganizations: mock(async () => [{ id: 'org-1' }]),
    getOrganizationRequests: mock(async () => ({
      requests: [{ id: 'req-1', reqNumber: 'REQ-123' }],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    })),
    getRequestsAggregation: mock(async () => ({
      services: [
        {
          id: 'service-1',
          name: 'Transport',
          slug: 'transport',
          type: 'service',
          count: 2,
          percentage: 100,
        },
      ],
      cargoTypes: [
        {
          id: 'category-1',
          name: 'Pallets',
          slug: 'pallets',
          count: 1,
          percentage: 50,
        },
      ],
    })),
    getOrganizationMembers: mock(async () => [{ id: 'member-1', role: 'admin' }]),
  }
}

function createAuthorization(): RequestAuthorizationPort {
  return {
    canPerformRequestActions: mock(async () => true),
    canAssignRequests: mock(async () => true),
    canViewAssignedRequests: mock(async () => true),
    getRequestOrganizationId: mock(async () => 'org-1'),
    resolveAccessibleRequestById: mock(async () => 'req-1'),
    resolveAccessibleRequestByNumber: mock(async () => 'req-1'),
  }
}

describe('Request use cases', () => {
  let request: Request
  let repository: RequestRepositoryPort
  let activity: ActivityLogPort
  let notifications: NotificationPort
  let memberships: OrganizationMembershipPort
  let assignmentMetrics: RequestAssignmentMetricsPort
  let creationMetrics: RequestCreationMetricsPort
  let creationConversations: RequestCreationConversationPort
  let linkingConversations: RequestLinkingConversationPort
  let teamChat: RequestTeamChatPort
  let organizationQueries: RequestOrganizationQueryPort
  let authorization: RequestAuthorizationPort

  beforeEach(() => {
    request = makeRequest()
    repository = createRepository(request)
    activity = createActivity()
    notifications = createNotifications()
    memberships = {
      hasMembership: mock(async () => true),
    }
    assignmentMetrics = createAssignmentMetrics()
    creationMetrics = createCreationMetrics()
    creationConversations = createCreationConversations()
    linkingConversations = createRequestLinkingConversations()
    teamChat = createTeamChat()
    organizationQueries = createOrganizationQueries()
    authorization = createAuthorization()
  })

  it('creates a request and logs member activity only when requester is an org member', async () => {
    const createData: CreateRequestData = {
      requesterEmail: 'requester@example.com',
      requesterName: 'Requester',
      requesterId: 'requester-user',
      receiverOrganizationId: 'org-1',
      fromDate: new Date(),
      toDate: new Date(),
    }
    const useCase = new CreateRequestUseCase(
      repository,
      memberships,
      activity,
      notifications,
      creationConversations,
      creationMetrics
    )

    const result = await useCase.execute(createData)

    expect(result.id).toBe('req-1')
    expect(result.conversationId).toBe('conversation-1')
    expect(repository.create).toHaveBeenCalledWith(createData)
    expect(creationConversations.resolveCreatedRequestConversation).toHaveBeenCalledWith({
      request: expect.objectContaining({ id: 'req-1', reqNumber: 'REQ-123' }),
      createData,
    })
    expect(repository.attachConversationToRequest).toHaveBeenCalledWith('req-1', 'conversation-1')
    expect(creationMetrics.recordCreatedRequest).toHaveBeenCalledWith('org-1')
    expect(memberships.hasMembership).toHaveBeenCalledWith('requester-user', 'org-1')
    expect(activity.logRequestCreated).toHaveBeenCalledWith(result, 'requester-user')
    expect(notifications.notifyRequestCreated).toHaveBeenCalledWith(result, createData)
  })

  it('updates a request through the repository use case', async () => {
    const useCase = new UpdateRequestUseCase(repository, activity)

    const result = await useCase.execute({
      requestId: 'req-1',
      data: { comments: 'Updated' },
    })

    expect(result.id).toBe('req-1')
    expect(repository.update).toHaveBeenCalledWith('req-1', { comments: 'Updated' })
    expect(activity.logRequestUpdated).not.toHaveBeenCalled()
  })

  it('logs request updates when an actor is provided', async () => {
    const useCase = new UpdateRequestUseCase(repository, activity)

    await useCase.execute({
      requestId: 'req-1',
      data: { comments: 'Updated' },
      actorId: 'admin-user',
    })

    expect(repository.update).toHaveBeenCalledWith('req-1', { comments: 'Updated' })
    expect(activity.logRequestUpdated).toHaveBeenCalledWith(request, 'admin-user')
  })

  it('loads request details through query use cases', async () => {
    const byIdUseCase = new GetRequestByIdUseCase(repository)
    const byNumberUseCase = new GetRequestByNumberUseCase(repository)

    const byId = await byIdUseCase.execute({ requestId: 'req-1' })
    const byNumber = await byNumberUseCase.execute({ requestNumber: 'REQ-123' })

    expect(byId?.id).toBe('req-1')
    expect(byNumber?.id).toBe('req-1')
    expect(repository.getByIdWithRelations).toHaveBeenCalledWith('req-1')
    expect(repository.getByNumber).toHaveBeenCalledWith('REQ-123')
  })

  it('lists user requests with the existing pagination envelope', async () => {
    repository.getUserRequests = mock(async (_userId, filters) =>
      filters?.limit === undefined ? [request, makeRequest({ id: 'req-2' })] : [request]
    )
    const useCase = new ListUserRequestsUseCase(repository)

    const result = await useCase.execute({
      userId: 'requester-user',
      filters: { lifecycleStatus: 'open', page: 2, limit: 1 },
    })

    expect(result.requests).toEqual([request])
    expect(result.pagination.total).toBe(2)
    expect(repository.getUserRequests).toHaveBeenNthCalledWith(1, 'requester-user', {
      lifecycleStatus: 'open',
      page: 2,
      limit: 1,
    })
    expect(repository.getUserRequests).toHaveBeenNthCalledWith(2, 'requester-user', {
      lifecycleStatus: 'open',
      page: undefined,
      limit: undefined,
    })
  })

  it('lists accessible organization requests when the user belongs to an organization', async () => {
    const useCase = new ListAccessibleRequestsUseCase(repository, organizationQueries)
    const fromDate = new Date('2026-05-08T00:00:00.000Z')
    const toDate = new Date('2026-05-09T00:00:00.000Z')

    const result = await useCase.execute({
      userId: 'member-user',
      filters: { lifecycleStatus: 'open', fromDate, toDate },
    })

    expect(result.pagination.total).toBe(1)
    expect(organizationQueries.getUserOrganizations).toHaveBeenCalledWith('member-user')
    expect(organizationQueries.getOrganizationRequests).toHaveBeenCalledWith(
      'org-1',
      'member-user',
      {
        lifecycleStatus: 'open',
        fromDate: '2026-05-08T00:00:00.000Z',
        toDate: '2026-05-09T00:00:00.000Z',
      }
    )
    expect(repository.getUserRequests).not.toHaveBeenCalled()
  })

  it('lists the requested organization when the user belongs to multiple organizations', async () => {
    organizationQueries = {
      ...organizationQueries,
      getUserOrganizations: mock(async () => [{ id: 'org-1' }, { id: 'org-2' }]),
    }
    const useCase = new ListAccessibleRequestsUseCase(repository, organizationQueries)

    await useCase.execute({
      userId: 'member-user',
      filters: { organizationId: 'org-2', lifecycleStatus: 'open' },
    })

    expect(organizationQueries.getOrganizationRequests).toHaveBeenCalledWith(
      'org-2',
      'member-user',
      {
        lifecycleStatus: 'open',
        fromDate: undefined,
        toDate: undefined,
      }
    )
  })

  it('rejects an organization request when the user is not a member of that organization', async () => {
    const useCase = new ListAccessibleRequestsUseCase(repository, organizationQueries)

    await expect(
      useCase.execute({
        userId: 'member-user',
        filters: { organizationId: 'org-2' },
      })
    ).rejects.toThrow('You are not a member of the requested organization')

    expect(organizationQueries.getOrganizationRequests).not.toHaveBeenCalled()
    expect(repository.getUserRequests).not.toHaveBeenCalled()
  })

  it('falls back to requester requests when the user has no organizations', async () => {
    organizationQueries = {
      ...organizationQueries,
      getUserOrganizations: mock(async () => []),
    }
    repository.getUserRequests = mock(async (_userId, filters) =>
      filters?.limit === undefined ? [request, makeRequest({ id: 'req-2' })] : [request]
    )
    const useCase = new ListAccessibleRequestsUseCase(repository, organizationQueries)

    const result = await useCase.execute({
      userId: 'requester-user',
      filters: { page: 1, limit: 1 },
    })

    expect(result.requests).toEqual([request])
    expect(result.pagination.total).toBe(2)
    expect(organizationQueries.getOrganizationRequests).not.toHaveBeenCalled()
    expect(repository.getUserRequests).toHaveBeenNthCalledWith(1, 'requester-user', {
      page: 1,
      limit: 1,
    })
    expect(repository.getUserRequests).toHaveBeenNthCalledWith(2, 'requester-user', {
      page: undefined,
      limit: undefined,
    })
  })

  it('lists organization members through the organization query port', async () => {
    const useCase = new ListRequestOrganizationMembersUseCase(organizationQueries)

    const members = await useCase.execute({ organizationId: 'org-1' })

    expect(members).toEqual([{ id: 'member-1', role: 'admin' }])
    expect(organizationQueries.getOrganizationMembers).toHaveBeenCalledWith('org-1')
  })

  it('lists requests for an explicit organization through the organization query port', async () => {
    const useCase = new ListOrganizationRequestsUseCase(organizationQueries)

    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'member-user',
      filters: { lifecycleStatus: 'open', page: 2, limit: 5 },
    })

    expect(result.pagination.total).toBe(1)
    expect(organizationQueries.getOrganizationRequests).toHaveBeenCalledWith(
      'org-1',
      'member-user',
      { lifecycleStatus: 'open', page: 2, limit: 5 }
    )
  })

  it('loads request aggregation for an organization through the query port', async () => {
    const useCase = new GetRequestOrganizationAggregationUseCase(organizationQueries)

    const result = await useCase.execute({ organizationId: 'org-1' })

    expect(result.services[0]?.id).toBe('service-1')
    expect(organizationQueries.getRequestsAggregation).toHaveBeenCalledWith('org-1')
  })

  it('delegates request authorization checks through the authorization port', async () => {
    const actionUseCase = new CheckRequestActionPermissionUseCase(authorization)
    const assignmentUseCase = new CheckRequestAssignmentPermissionUseCase(authorization)
    const viewUseCase = new CheckRequestViewPermissionUseCase(authorization)
    const requestOrganizationUseCase = new ResolveRequestOrganizationUseCase(authorization)
    const accessByIdUseCase = new ResolveAccessibleRequestByIdUseCase(authorization)
    const accessByNumberUseCase = new ResolveAccessibleRequestByNumberUseCase(authorization)

    await expect(actionUseCase.execute({ requestId: 'req-1', userId: 'admin-user' })).resolves.toBe(
      true
    )
    await expect(
      assignmentUseCase.execute({ organizationId: 'org-1', userId: 'admin-user' })
    ).resolves.toBe(true)
    await expect(viewUseCase.execute({ requestId: 'req-1', userId: 'member-user' })).resolves.toBe(
      true
    )
    await expect(requestOrganizationUseCase.execute({ requestId: 'req-1' })).resolves.toBe('org-1')
    await expect(
      accessByIdUseCase.execute({ requestId: 'req-1', userId: 'requester-user' })
    ).resolves.toBe('req-1')
    await expect(
      accessByNumberUseCase.execute({ requestNumber: 'REQ-123', userId: 'requester-user' })
    ).resolves.toBe('req-1')

    expect(authorization.canPerformRequestActions).toHaveBeenCalledWith('req-1', 'admin-user')
    expect(authorization.canAssignRequests).toHaveBeenCalledWith('org-1', 'admin-user')
    expect(authorization.canViewAssignedRequests).toHaveBeenCalledWith('req-1', 'member-user')
    expect(authorization.getRequestOrganizationId).toHaveBeenCalledWith('req-1')
    expect(authorization.resolveAccessibleRequestById).toHaveBeenCalledWith(
      'req-1',
      'requester-user'
    )
    expect(authorization.resolveAccessibleRequestByNumber).toHaveBeenCalledWith(
      'REQ-123',
      'requester-user'
    )
  })

  it('checks request receiver membership through the membership port', async () => {
    const useCase = new CheckRequestReceiverMembershipUseCase(memberships)

    await expect(
      useCase.execute({ userId: 'requester-user', organizationId: 'org-1' })
    ).resolves.toBe(true)
    expect(memberships.hasMembership).toHaveBeenCalledWith('requester-user', 'org-1')
  })

  it('lists assigned and unassigned requests through query use cases', async () => {
    const assignedUseCase = new ListAssignedRequestsUseCase(repository)
    const unassignedUseCase = new ListUnassignedRequestsUseCase(repository)

    await assignedUseCase.execute({
      userId: 'member-user',
      organizationId: 'org-1',
      filters: { lifecycleStatus: 'open' },
    })
    await unassignedUseCase.execute({
      organizationId: 'org-1',
      filters: { page: 1 },
    })

    expect(repository.getAssignedRequests).toHaveBeenCalledWith('member-user', 'org-1', {
      lifecycleStatus: 'open',
    })
    expect(repository.getUnassignedRequests).toHaveBeenCalledWith('org-1', { page: 1 })
  })

  it('rejects a request through the repository and side-effect ports', async () => {
    const useCase = new RejectRequestUseCase(repository, activity, notifications)

    await useCase.execute({ requestId: 'req-1', userId: 'admin-user', reason: 'Not suitable' })

    expect(repository.reject).toHaveBeenCalledWith('req-1', 'admin-user', 'Not suitable')
    expect(activity.logRequestRejected).toHaveBeenCalledWith(request, 'admin-user')
    expect(notifications.notifyRequestRejected).toHaveBeenCalledWith(
      request,
      'admin-user',
      'Not suitable'
    )
  })

  it('cancels a request through the repository and side-effect ports', async () => {
    const useCase = new CancelRequestUseCase(repository, activity, notifications)

    await useCase.execute({ requestId: 'req-1', userId: 'requester-user' })

    expect(repository.cancel).toHaveBeenCalledWith('req-1', 'requester-user')
    expect(activity.logRequestCanceled).toHaveBeenCalledWith(request, 'requester-user')
    expect(notifications.notifyRequestCanceled).toHaveBeenCalledWith(request, 'requester-user')
  })

  it('rejects cancellation by a different requester before persistence and side effects', async () => {
    const useCase = new CancelRequestUseCase(repository, activity, notifications)

    await expect(
      useCase.execute({ requestId: 'req-1', userId: 'other-requester' })
    ).rejects.toThrow('Only the request owner can cancel this request')

    expect(repository.cancel).not.toHaveBeenCalled()
    expect(activity.logRequestCanceled).not.toHaveBeenCalled()
    expect(notifications.notifyRequestCanceled).not.toHaveBeenCalled()
  })

  it('validates only draft requests', async () => {
    request = makeRequest({ lifecycleStatus: 'draft' })
    repository = createRepository(request)
    const useCase = new ValidateDraftRequestUseCase(repository, activity, notifications)

    await useCase.execute({ requestId: 'req-1', userId: 'admin-user' })

    expect(repository.validateDraft).toHaveBeenCalledWith('req-1', 'admin-user')
    expect(activity.logRequestValidated).toHaveBeenCalledWith(request, 'admin-user')
    expect(notifications.notifyDraftValidated).toHaveBeenCalledWith(request)
  })

  it('deletes only draft requests and logs the deletion', async () => {
    request = makeRequest({ lifecycleStatus: 'draft' })
    repository = createRepository(request)
    const useCase = new DeleteDraftRequestUseCase(repository, activity)

    await useCase.execute({ requestId: 'req-1', userId: 'admin-user' })

    expect(repository.deleteDraft).toHaveBeenCalledWith('req-1')
    expect(activity.logRequestDeleted).toHaveBeenCalledWith(request, 'admin-user')
  })

  it('rejects draft deletion when the request is not a draft', async () => {
    const useCase = new DeleteDraftRequestUseCase(repository, activity)

    await expect(useCase.execute({ requestId: 'req-1', userId: 'admin-user' })).rejects.toThrow(
      'Only draft requests can be deleted'
    )
    expect(repository.deleteDraft).not.toHaveBeenCalled()
    expect(activity.logRequestDeleted).not.toHaveBeenCalled()
  })

  it('links anonymous requests to a user with resolved conversations', async () => {
    const useCase = new LinkRequestsToUserUseCase(repository, linkingConversations)

    await useCase.execute({ userEmail: 'requester@example.com', userId: 'user-1' })

    expect(repository.findAnonymousByRequesterEmail).toHaveBeenCalledWith('requester@example.com')
    expect(linkingConversations.resolveLinkedRequestConversation).toHaveBeenCalledWith({
      request,
      userEmail: 'requester@example.com',
      userId: 'user-1',
    })
    expect(repository.linkAnonymousRequestToUser).toHaveBeenCalledWith(
      'req-1',
      'user-1',
      'conversation-1'
    )
  })

  it('skips link work when there are no anonymous requests', async () => {
    repository = createRepository(null)
    const useCase = new LinkRequestsToUserUseCase(repository, linkingConversations)

    await useCase.execute({ userEmail: 'missing@example.com', userId: 'user-1' })

    expect(repository.findAnonymousByRequesterEmail).toHaveBeenCalledWith('missing@example.com')
    expect(linkingConversations.resolveLinkedRequestConversation).not.toHaveBeenCalled()
    expect(repository.linkAnonymousRequestToUser).not.toHaveBeenCalled()
  })

  it('shares a request to team chat through membership and activity ports', async () => {
    const useCase = new ShareRequestToTeamChatUseCase(repository, memberships, teamChat, activity)

    const message = await useCase.execute({ requestId: 'req-1', userId: 'admin-user' })

    expect(message.id).toBe('message-1')
    expect(memberships.hasMembership).toHaveBeenCalledWith('admin-user', 'org-1')
    expect(teamChat.shareRequest).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'admin-user',
      requestId: 'req-1',
      requestNumber: 'REQ-123',
    })
    expect(activity.logRequestSharedToTeamChat).toHaveBeenCalledWith(request, 'admin-user')
  })

  it('rejects team chat sharing when the actor is not an organization member', async () => {
    memberships = {
      hasMembership: mock(async () => false),
    }
    const useCase = new ShareRequestToTeamChatUseCase(repository, memberships, teamChat, activity)

    await expect(useCase.execute({ requestId: 'req-1', userId: 'external-user' })).rejects.toThrow(
      'You must be a member of the organization to share requests'
    )
    expect(teamChat.shareRequest).not.toHaveBeenCalled()
    expect(activity.logRequestSharedToTeamChat).not.toHaveBeenCalled()
  })

  it('returns a typed not found error when the team chat is missing', async () => {
    teamChat = {
      shareRequest: mock(async () => null),
    }
    const useCase = new ShareRequestToTeamChatUseCase(repository, memberships, teamChat, activity)

    await expect(useCase.execute({ requestId: 'req-1', userId: 'admin-user' })).rejects.toThrow(
      'Team chat not found for this organization'
    )
    expect(activity.logRequestSharedToTeamChat).not.toHaveBeenCalled()
  })

  it('assigns a request through the repository and side-effect ports', async () => {
    const useCase = new AssignRequestUseCase(
      repository,
      memberships,
      assignmentMetrics,
      activity,
      notifications
    )

    await useCase.execute({
      requestId: 'req-1',
      assignedToId: 'member-user',
      assignedById: 'admin-user',
    })

    expect(memberships.hasMembership).toHaveBeenCalledWith('member-user', 'org-1')
    expect(repository.assignToMember).toHaveBeenCalledWith('req-1', 'member-user', 'admin-user')
    expect(assignmentMetrics.recordAssignedRequest).toHaveBeenCalledWith('member-user', 'org-1')
    expect(activity.logRequestAssigned).toHaveBeenCalledWith(request, 'member-user', 'admin-user')
    expect(notifications.notifyRequestAssigned).toHaveBeenCalledWith(
      request,
      'member-user',
      'admin-user'
    )
  })

  it('reassigns a request through the repository and side-effect ports', async () => {
    const useCase = new ReassignRequestUseCase(repository, memberships, activity, notifications)

    await useCase.execute({
      requestId: 'req-1',
      assignedToId: 'member-user',
      assignedById: 'admin-user',
    })

    expect(memberships.hasMembership).toHaveBeenCalledWith('member-user', 'org-1')
    expect(repository.reassignToMember).toHaveBeenCalledWith('req-1', 'member-user', 'admin-user')
    expect(activity.logRequestReassigned).toHaveBeenCalledWith(request, 'member-user', 'admin-user')
    expect(notifications.notifyRequestReassigned).toHaveBeenCalledWith(
      request,
      'member-user',
      'admin-user'
    )
  })

  it('unassigns a request through the repository and side-effect ports', async () => {
    request = makeRequest({ assignedToId: 'member-user' })
    repository = createRepository(request)
    const useCase = new UnassignRequestUseCase(repository, activity, notifications)

    await useCase.execute({ requestId: 'req-1', unassignedById: 'admin-user' })

    expect(repository.unassignRequest).toHaveBeenCalledWith('req-1')
    expect(activity.logRequestUnassigned).toHaveBeenCalledWith(request, 'admin-user', 'member-user')
    expect(notifications.notifyRequestUnassigned).toHaveBeenCalledWith(
      request,
      'admin-user',
      'member-user'
    )
  })

  it('rejects assignment when the assignee is not an organization member', async () => {
    memberships = {
      hasMembership: mock(async () => false),
    }
    const useCase = new AssignRequestUseCase(
      repository,
      memberships,
      assignmentMetrics,
      activity,
      notifications
    )

    await expect(
      useCase.execute({
        requestId: 'req-1',
        assignedToId: 'external-user',
        assignedById: 'admin-user',
      })
    ).rejects.toThrow('User is not a member of the organization')

    expect(repository.assignToMember).not.toHaveBeenCalled()
    expect(assignmentMetrics.recordAssignedRequest).not.toHaveBeenCalled()
    expect(activity.logRequestAssigned).not.toHaveBeenCalled()
    expect(notifications.notifyRequestAssigned).not.toHaveBeenCalled()
  })

  it('throws Request not found before mutating when the repository misses', async () => {
    repository = createRepository(null)
    const useCase = new RejectRequestUseCase(repository, activity, notifications)

    await expect(useCase.execute({ requestId: 'missing', userId: 'admin-user' })).rejects.toThrow(
      'Request not found'
    )
    expect(repository.reject).not.toHaveBeenCalled()
  })
})
