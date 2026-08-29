import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CreateRequestData, Request } from '../application/request-models'
import type { RequestUseCaseContainer } from '../infrastructure/request-use-cases'
import { RequestsApplicationService } from '../requests.application'

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    receiverOrganizationId: 'org-1',
    fromDate: new Date(),
    toDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeTeamChatMessage() {
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
  }
}

function createUseCases(): RequestUseCaseContainer {
  return {
    create: { execute: mock(async () => makeRequest()) },
    update: { execute: mock(async () => makeRequest({ comments: 'Updated' })) },
    getById: { execute: mock(async () => makeRequest()) },
    getByNumber: { execute: mock(async () => makeRequest()) },
    listUser: {
      execute: mock(async () => ({
        requests: [makeRequest()],
        pagination: { total: 1 },
      })),
    },
    listAssigned: { execute: mock(async () => [makeRequest({ assignedToId: 'member-user' })]) },
    listUnassigned: { execute: mock(async () => [makeRequest({ assignedToId: null })]) },
    listAccessible: {
      execute: mock(async () => ({
        requests: [makeRequest()],
        pagination: { total: 1 },
      })),
    },
    listOrganizationRequests: {
      execute: mock(async () => ({
        requests: [makeRequest()],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })),
    },
    getOrganizationAggregation: {
      execute: mock(async () => ({
        services: [],
        cargoTypes: [],
      })),
    },
    listOrganizationMembers: { execute: mock(async () => [{ id: 'member-1' }]) },
    reject: { execute: mock(async () => undefined) },
    cancel: { execute: mock(async () => undefined) },
    deleteDraft: { execute: mock(async () => undefined) },
    validateDraft: { execute: mock(async () => undefined) },
    assign: { execute: mock(async () => undefined) },
    reassign: { execute: mock(async () => undefined) },
    unassign: { execute: mock(async () => undefined) },
    linkToUser: { execute: mock(async () => undefined) },
    shareToTeamChat: { execute: mock(async () => makeTeamChatMessage()) },
    checkActionPermission: { execute: mock(async () => true) },
    checkAssignmentPermission: { execute: mock(async () => true) },
    checkViewPermission: { execute: mock(async () => true) },
    resolveRequestOrganization: { execute: mock(async () => 'org-1') },
    resolveAccessibleRequestById: { execute: mock(async () => 'req-1') },
    resolveAccessibleRequestByNumber: { execute: mock(async () => 'req-1') },
    checkReceiverMembership: { execute: mock(async () => true) },
  } as unknown as RequestUseCaseContainer
}

describe('RequestsApplicationService', () => {
  let useCases: RequestUseCaseContainer
  let service: RequestsApplicationService

  beforeEach(() => {
    useCases = createUseCases()
    service = new RequestsApplicationService(useCases)
  })

  it('delegates request creation to the create use case', async () => {
    const data: CreateRequestData = {
      requesterEmail: 'requester@example.com',
      requesterName: 'Requester',
      receiverOrganizationId: 'org-1',
      fromDate: new Date(),
      toDate: new Date(),
    }

    const result = await service.createRequest(data)

    expect(result.id).toBe('req-1')
    expect(useCases.create.execute).toHaveBeenCalledWith(data)
  })

  it('delegates request updates to the update use case', async () => {
    const result = await service.updateRequest('req-1', { comments: 'Updated' })

    expect(result.comments).toBe('Updated')
    expect(useCases.update.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      data: { comments: 'Updated' },
    })
  })

  it('delegates request queries to use cases', async () => {
    await service.getRequestById('req-1')
    await service.getRequestByNumber('REQ-123')
    await service.getUserRequests('requester-user', { lifecycleStatus: 'open', page: 1 })
    await service.getAccessibleRequests('member-user', { lifecycleStatus: 'open' })
    await service.getOrganizationRequests('org-1', 'member-user', { lifecycleStatus: 'open' })
    await service.getOrganizationRequestsAggregation('org-1')
    await service.getOrganizationMembers('org-1')
    await service.getAssignedRequests('member-user', 'org-1', { lifecycleStatus: 'open' })
    await service.getUnassignedRequests('org-1', { page: 1 })

    expect(useCases.getById.execute).toHaveBeenCalledWith({ requestId: 'req-1' })
    expect(useCases.getByNumber.execute).toHaveBeenCalledWith({ requestNumber: 'REQ-123' })
    expect(useCases.listUser.execute).toHaveBeenCalledWith({
      userId: 'requester-user',
      filters: { lifecycleStatus: 'open', page: 1 },
    })
    expect(useCases.listAccessible.execute).toHaveBeenCalledWith({
      userId: 'member-user',
      filters: { lifecycleStatus: 'open' },
    })
    expect(useCases.listOrganizationRequests.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'member-user',
      filters: { lifecycleStatus: 'open' },
    })
    expect(useCases.getOrganizationAggregation.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
    })
    expect(useCases.listOrganizationMembers.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
    })
    expect(useCases.listAssigned.execute).toHaveBeenCalledWith({
      userId: 'member-user',
      organizationId: 'org-1',
      filters: { lifecycleStatus: 'open' },
    })
    expect(useCases.listUnassigned.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      filters: { page: 1 },
    })
  })

  it('delegates request lifecycle operations to use cases', async () => {
    await service.rejectRequest('req-1', 'admin-user', 'Not suitable')
    await service.cancelRequest('req-1', 'requester-user')
    await service.deleteDraft('req-1', 'admin-user')
    await service.validateDraft('req-1', 'admin-user')
    await service.assignRequestToMember('req-1', 'member-user', 'admin-user')
    await service.reassignRequestToMember('req-1', 'member-user-2', 'admin-user')
    await service.unassignRequest('req-1', 'admin-user')
    await service.linkRequestsToUser('requester@example.com', 'user-1')
    await service.shareRequestToTeamChat('req-1', 'admin-user')

    expect(useCases.reject.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'admin-user',
      reason: 'Not suitable',
    })
    expect(useCases.cancel.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'requester-user',
    })
    expect(useCases.deleteDraft.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'admin-user',
    })
    expect(useCases.validateDraft.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'admin-user',
    })
    expect(useCases.assign.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      assignedToId: 'member-user',
      assignedById: 'admin-user',
    })
    expect(useCases.reassign.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      assignedToId: 'member-user-2',
      assignedById: 'admin-user',
    })
    expect(useCases.unassign.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      unassignedById: 'admin-user',
    })
    expect(useCases.linkToUser.execute).toHaveBeenCalledWith({
      userEmail: 'requester@example.com',
      userId: 'user-1',
    })
    expect(useCases.shareToTeamChat.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'admin-user',
    })
  })

  it('delegates request authorization operations to use cases', async () => {
    await expect(service.canPerformRequestActions('req-1', 'admin-user')).resolves.toBe(true)
    await expect(service.canAssignRequests('org-1', 'admin-user')).resolves.toBe(true)
    await expect(service.canViewAssignedRequests('req-1', 'member-user')).resolves.toBe(true)
    await expect(service.getRequestOrganizationId('req-1')).resolves.toBe('org-1')
    await expect(service.resolveAccessibleRequestById('req-1', 'requester-user')).resolves.toBe(
      'req-1'
    )
    await expect(
      service.resolveAccessibleRequestByNumber('REQ-123', 'requester-user')
    ).resolves.toBe('req-1')
    await expect(service.isRequestToUserOrganization('user-1', 'org-1')).resolves.toBe(true)

    expect(useCases.checkActionPermission.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'admin-user',
    })
    expect(useCases.checkAssignmentPermission.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'admin-user',
    })
    expect(useCases.checkViewPermission.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'member-user',
    })
    expect(useCases.resolveRequestOrganization.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
    })
    expect(useCases.resolveAccessibleRequestById.execute).toHaveBeenCalledWith({
      requestId: 'req-1',
      userId: 'requester-user',
    })
    expect(useCases.resolveAccessibleRequestByNumber.execute).toHaveBeenCalledWith({
      requestNumber: 'REQ-123',
      userId: 'requester-user',
    })
    expect(useCases.checkReceiverMembership.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
    })
  })
})
