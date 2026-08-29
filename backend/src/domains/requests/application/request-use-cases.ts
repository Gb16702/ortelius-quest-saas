import {
  InvalidRequestAssignmentError,
  RequestNotFoundError,
  RequestOrganizationForbiddenError,
  RequestShareForbiddenError,
  RequestTeamChatNotFoundError,
} from '../domain/errors'
import { RequestAggregate } from '../domain/request'
import type {
  ActivityLogPort,
  NotificationPort,
  OrganizationMembershipPort,
  RequestAssignmentMetricsPort,
  RequestAuthorizationPort,
  RequestCreationConversationPort,
  RequestCreationMetricsPort,
  RequestLinkingConversationPort,
  RequestOrganizationFilters,
  RequestOrganizationQueryPort,
  RequestOrganizationRequestsAggregationResult,
  RequestOrganizationRequestsResult,
  RequestRepositoryPort,
  RequestTeamChatMessage,
  RequestTeamChatPort,
  RequestUserRequestsResult,
} from './ports'
import type {
  CreateRequestData,
  Request,
  RequestFilters,
  RequestWithRelations,
  UpdateRequestData,
} from './request-models'

export class CreateRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly memberships: OrganizationMembershipPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort,
    private readonly conversations: RequestCreationConversationPort,
    private readonly metrics: RequestCreationMetricsPort
  ) {}

  async execute(data: CreateRequestData): Promise<Request> {
    let request = await this.requests.create(data)

    const conversationId = await this.conversations.resolveCreatedRequestConversation({
      request,
      createData: data,
    })

    if (conversationId) {
      await this.requests.attachConversationToRequest(request.id, conversationId)
      request = { ...request, conversationId }
    }

    await this.metrics.recordCreatedRequest(data.receiverOrganizationId)

    if (
      data.requesterId &&
      (await this.memberships.hasMembership(data.requesterId, data.receiverOrganizationId))
    ) {
      await this.activity.logRequestCreated(request, data.requesterId)
    }

    await this.notifications.notifyRequestCreated(request, data)
    return request
  }
}

export class GetRequestByIdUseCase {
  constructor(private readonly requests: RequestRepositoryPort) {}

  async execute(command: { requestId: string }): Promise<RequestWithRelations | null> {
    return await this.requests.getByIdWithRelations(command.requestId)
  }
}

export class GetRequestByNumberUseCase {
  constructor(private readonly requests: RequestRepositoryPort) {}

  async execute(command: { requestNumber: string }): Promise<RequestWithRelations | null> {
    return await this.requests.getByNumber(command.requestNumber)
  }
}

export class UpdateRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly activity: ActivityLogPort
  ) {}

  async execute(command: {
    requestId: string
    data: UpdateRequestData
    actorId?: string
  }): Promise<Request> {
    const request = await this.requests.update(command.requestId, command.data)

    if (command.actorId) {
      await this.activity.logRequestUpdated(request, command.actorId)
    }

    return request
  }
}

export class DeleteDraftRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly activity: ActivityLogPort
  ) {}

  async execute(command: { requestId: string; userId: string }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    RequestAggregate.from(request).assertCanDeleteDraft()

    await this.requests.deleteDraft(command.requestId)
    await this.activity.logRequestDeleted(request, command.userId)
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class ListUserRequestsUseCase {
  constructor(private readonly requests: RequestRepositoryPort) {}

  async execute(command: {
    userId: string
    filters?: RequestFilters
  }): Promise<RequestUserRequestsResult> {
    const requests = await this.requests.getUserRequests(command.userId, command.filters)
    const allRequests = await this.requests.getUserRequests(command.userId, {
      ...command.filters,
      limit: undefined,
      page: undefined,
    })

    return {
      requests,
      pagination: {
        total: allRequests.length,
      },
    }
  }
}

export class ListAccessibleRequestsUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly organizations: RequestOrganizationQueryPort
  ) {}

  async execute(command: {
    userId: string
    filters?: RequestFilters
  }): Promise<RequestOrganizationRequestsResult | RequestUserRequestsResult> {
    const userOrganizations = await this.organizations.getUserOrganizations(command.userId)

    if (userOrganizations.length > 0) {
      const requestedOrganizationId = command.filters?.organizationId
      const organizationId = requestedOrganizationId ?? userOrganizations[0].id

      if (
        requestedOrganizationId &&
        !userOrganizations.some((organization) => organization.id === requestedOrganizationId)
      ) {
        throw new RequestOrganizationForbiddenError(requestedOrganizationId)
      }

      return await this.organizations.getOrganizationRequests(
        organizationId,
        command.userId,
        this.toOrganizationFilters(command.filters)
      )
    }

    const requests = await this.requests.getUserRequests(command.userId, command.filters)
    const allRequests = await this.requests.getUserRequests(command.userId, {
      ...command.filters,
      limit: undefined,
      page: undefined,
    })

    return {
      requests,
      pagination: {
        total: allRequests.length,
      },
    }
  }

  private toOrganizationFilters(filters?: RequestFilters): RequestOrganizationFilters | undefined {
    if (!filters) return undefined

    const { organizationId: _organizationId, ...filtersWithoutOrganizationId } = filters

    return {
      ...filtersWithoutOrganizationId,
      fromDate: filters.fromDate ? filters.fromDate.toISOString() : undefined,
      toDate: filters.toDate ? filters.toDate.toISOString() : undefined,
    }
  }
}

export class ListOrganizationRequestsUseCase {
  constructor(private readonly organizations: RequestOrganizationQueryPort) {}

  async execute(command: {
    organizationId: string
    userId: string
    filters?: RequestOrganizationFilters
  }): Promise<RequestOrganizationRequestsResult> {
    return await this.organizations.getOrganizationRequests(
      command.organizationId,
      command.userId,
      command.filters
    )
  }
}

export class ListRequestOrganizationMembersUseCase {
  constructor(private readonly organizations: RequestOrganizationQueryPort) {}

  async execute(command: { organizationId: string }): Promise<unknown[]> {
    return await this.organizations.getOrganizationMembers(command.organizationId)
  }
}

export class GetRequestOrganizationAggregationUseCase {
  constructor(private readonly organizations: RequestOrganizationQueryPort) {}

  async execute(command: {
    organizationId: string
  }): Promise<RequestOrganizationRequestsAggregationResult> {
    return await this.organizations.getRequestsAggregation(command.organizationId)
  }
}

export class CheckRequestActionPermissionUseCase {
  constructor(private readonly authorization: RequestAuthorizationPort) {}

  async execute(command: { requestId: string; userId: string }): Promise<boolean> {
    return await this.authorization.canPerformRequestActions(command.requestId, command.userId)
  }
}

export class CheckRequestAssignmentPermissionUseCase {
  constructor(private readonly authorization: RequestAuthorizationPort) {}

  async execute(command: { organizationId: string; userId: string }): Promise<boolean> {
    return await this.authorization.canAssignRequests(command.organizationId, command.userId)
  }
}

export class CheckRequestViewPermissionUseCase {
  constructor(private readonly authorization: RequestAuthorizationPort) {}

  async execute(command: { requestId: string; userId: string }): Promise<boolean> {
    return await this.authorization.canViewAssignedRequests(command.requestId, command.userId)
  }
}

export class ResolveRequestOrganizationUseCase {
  constructor(private readonly authorization: RequestAuthorizationPort) {}

  async execute(command: { requestId: string }): Promise<string | null> {
    return await this.authorization.getRequestOrganizationId(command.requestId)
  }
}

export class ResolveAccessibleRequestByIdUseCase {
  constructor(private readonly authorization: RequestAuthorizationPort) {}

  async execute(command: { requestId: string; userId: string }): Promise<string | null> {
    return await this.authorization.resolveAccessibleRequestById(command.requestId, command.userId)
  }
}

export class ResolveAccessibleRequestByNumberUseCase {
  constructor(private readonly authorization: RequestAuthorizationPort) {}

  async execute(command: { requestNumber: string; userId: string }): Promise<string | null> {
    return await this.authorization.resolveAccessibleRequestByNumber(
      command.requestNumber,
      command.userId
    )
  }
}

export class CheckRequestReceiverMembershipUseCase {
  constructor(private readonly memberships: OrganizationMembershipPort) {}

  async execute(command: { userId: string; organizationId: string }): Promise<boolean> {
    return await this.memberships.hasMembership(command.userId, command.organizationId)
  }
}

export class ListAssignedRequestsUseCase {
  constructor(private readonly requests: RequestRepositoryPort) {}

  async execute(command: {
    userId: string
    organizationId: string
    filters?: RequestFilters
  }): Promise<Request[]> {
    return await this.requests.getAssignedRequests(
      command.userId,
      command.organizationId,
      command.filters
    )
  }
}

export class ListUnassignedRequestsUseCase {
  constructor(private readonly requests: RequestRepositoryPort) {}

  async execute(command: { organizationId: string; filters?: RequestFilters }): Promise<Request[]> {
    return await this.requests.getUnassignedRequests(command.organizationId, command.filters)
  }
}

export class ShareRequestToTeamChatUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly memberships: OrganizationMembershipPort,
    private readonly teamChat: RequestTeamChatPort,
    private readonly activity: ActivityLogPort
  ) {}

  async execute(command: { requestId: string; userId: string }): Promise<RequestTeamChatMessage> {
    const request = await this.requireRequest(command.requestId)

    const hasMembership = await this.memberships.hasMembership(
      command.userId,
      request.receiverOrganizationId
    )
    if (!hasMembership) throw new RequestShareForbiddenError()

    const message = await this.teamChat.shareRequest({
      organizationId: request.receiverOrganizationId,
      actorId: command.userId,
      requestId: request.id,
      requestNumber: request.reqNumber,
    })
    if (!message) throw new RequestTeamChatNotFoundError(request.receiverOrganizationId)

    await this.activity.logRequestSharedToTeamChat(request, command.userId)
    return message
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class RejectRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort
  ) {}

  async execute(command: { requestId: string; userId: string; reason?: string }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    RequestAggregate.from(request).reject(command.userId, command.reason)

    await this.requests.reject(command.requestId, command.userId, command.reason)
    await this.activity.logRequestRejected(request, command.userId)
    await this.notifications.notifyRequestRejected(request, command.userId, command.reason)
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class CancelRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort
  ) {}

  async execute(command: { requestId: string; userId: string }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    RequestAggregate.from(request).cancel(command.userId)

    await this.requests.cancel(command.requestId, command.userId)
    await this.activity.logRequestCanceled(request, command.userId)
    await this.notifications.notifyRequestCanceled(request, command.userId)
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class ValidateDraftRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort
  ) {}

  async execute(command: { requestId: string; userId: string }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    RequestAggregate.from(request).validateDraft(command.userId)

    await this.requests.validateDraft(command.requestId, command.userId)
    await this.activity.logRequestValidated(request, command.userId)
    await this.notifications.notifyDraftValidated(request)
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class LinkRequestsToUserUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly conversations: RequestLinkingConversationPort
  ) {}

  async execute(command: { userEmail: string; userId: string }): Promise<void> {
    const anonymousRequests = await this.requests.findAnonymousByRequesterEmail(command.userEmail)
    if (anonymousRequests.length === 0) return

    for (const request of anonymousRequests) {
      const conversationId = await this.conversations.resolveLinkedRequestConversation({
        request,
        userEmail: command.userEmail,
        userId: command.userId,
      })

      await this.requests.linkAnonymousRequestToUser(request.id, command.userId, conversationId)
    }
  }
}

export class AssignRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly memberships: OrganizationMembershipPort,
    private readonly assignmentMetrics: RequestAssignmentMetricsPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort
  ) {}

  async execute(command: {
    requestId: string
    assignedToId: string
    assignedById: string
  }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    const isOrganizationMember = await this.memberships.hasMembership(
      command.assignedToId,
      request.receiverOrganizationId
    )
    if (!isOrganizationMember) {
      throw new InvalidRequestAssignmentError('User is not a member of the organization')
    }

    RequestAggregate.from(request).assignToMember(command.assignedToId, command.assignedById)

    await this.requests.assignToMember(
      command.requestId,
      command.assignedToId,
      command.assignedById
    )
    await this.assignmentMetrics.recordAssignedRequest(
      command.assignedToId,
      request.receiverOrganizationId
    )
    await this.activity.logRequestAssigned(request, command.assignedToId, command.assignedById)
    await this.notifications.notifyRequestAssigned(
      request,
      command.assignedToId,
      command.assignedById
    )
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class ReassignRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly memberships: OrganizationMembershipPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort
  ) {}

  async execute(command: {
    requestId: string
    assignedToId: string
    assignedById: string
  }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    const isOrganizationMember = await this.memberships.hasMembership(
      command.assignedToId,
      request.receiverOrganizationId
    )
    if (!isOrganizationMember) {
      throw new InvalidRequestAssignmentError('User is not a member of the organization')
    }

    RequestAggregate.from(request).assignToMember(command.assignedToId, command.assignedById)

    await this.requests.reassignToMember(
      command.requestId,
      command.assignedToId,
      command.assignedById
    )
    await this.activity.logRequestReassigned(request, command.assignedToId, command.assignedById)
    await this.notifications.notifyRequestReassigned(
      request,
      command.assignedToId,
      command.assignedById
    )
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}

export class UnassignRequestUseCase {
  constructor(
    private readonly requests: RequestRepositoryPort,
    private readonly activity: ActivityLogPort,
    private readonly notifications: NotificationPort
  ) {}

  async execute(command: { requestId: string; unassignedById: string }): Promise<void> {
    const request = await this.requireRequest(command.requestId)
    const previousAssignedToId = request.assignedToId
    RequestAggregate.from(request).unassign(command.unassignedById)

    await this.requests.unassignRequest(command.requestId)
    await this.activity.logRequestUnassigned(request, command.unassignedById, previousAssignedToId)
    await this.notifications.notifyRequestUnassigned(
      request,
      command.unassignedById,
      previousAssignedToId
    )
  }

  private async requireRequest(requestId: string): Promise<Request> {
    const request = await this.requests.getById(requestId)
    if (!request) throw new RequestNotFoundError(requestId)
    return request
  }
}
