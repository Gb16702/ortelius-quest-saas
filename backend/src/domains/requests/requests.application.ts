import type {
  RequestOrganizationFilters,
  RequestOrganizationRequestsAggregationResult,
  RequestOrganizationRequestsResult,
  RequestTeamChatMessage,
  RequestUserRequestsResult,
} from './application/ports'
import type {
  CreateRequestData,
  Request,
  RequestFilters,
  RequestWithRelations,
  UpdateRequestData,
} from './application/request-models'
import {
  getRequestUseCases,
  type RequestUseCaseContainer,
} from './infrastructure/request-use-cases'

export class RequestsApplicationService {
  constructor(private readonly injectedUseCases?: RequestUseCaseContainer) {}

  async createRequest(data: CreateRequestData): Promise<Request> {
    const useCases = await this.getUseCases()
    return await useCases.create.execute(data)
  }

  async updateRequest(id: string, data: UpdateRequestData, actorId?: string): Promise<Request> {
    const useCases = await this.getUseCases()
    const command = actorId ? { requestId: id, data, actorId } : { requestId: id, data }
    return await useCases.update.execute(command)
  }

  async getRequestById(id: string): Promise<RequestWithRelations | null> {
    const useCases = await this.getUseCases()
    return await useCases.getById.execute({ requestId: id })
  }

  async getRequestByNumber(requestNumber: string): Promise<RequestWithRelations | null> {
    const useCases = await this.getUseCases()
    return await useCases.getByNumber.execute({ requestNumber })
  }

  async getUserRequests(
    userId: string,
    filters?: RequestFilters
  ): Promise<{ requests: Request[]; pagination: { total: number } }> {
    const useCases = await this.getUseCases()
    return await useCases.listUser.execute({ userId, filters })
  }

  async getAccessibleRequests(
    userId: string,
    filters?: RequestFilters
  ): Promise<RequestOrganizationRequestsResult | RequestUserRequestsResult> {
    const useCases = await this.getUseCases()
    return await useCases.listAccessible.execute({ userId, filters })
  }

  async getOrganizationRequests(
    organizationId: string,
    userId: string,
    filters?: RequestOrganizationFilters
  ): Promise<RequestOrganizationRequestsResult> {
    const useCases = await this.getUseCases()
    return await useCases.listOrganizationRequests.execute({ organizationId, userId, filters })
  }

  async getOrganizationRequestsAggregation(
    organizationId: string
  ): Promise<RequestOrganizationRequestsAggregationResult> {
    const useCases = await this.getUseCases()
    return await useCases.getOrganizationAggregation.execute({ organizationId })
  }

  async getOrganizationMembers(organizationId: string): Promise<unknown[]> {
    const useCases = await this.getUseCases()
    return await useCases.listOrganizationMembers.execute({ organizationId })
  }

  async rejectRequest(requestId: string, userId: string, reason?: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.reject.execute({ requestId, userId, reason })
  }

  async cancelRequest(requestId: string, userId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.cancel.execute({ requestId, userId })
  }

  async deleteDraft(requestId: string, userId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.deleteDraft.execute({ requestId, userId })
  }

  async validateDraft(requestId: string, userId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.validateDraft.execute({ requestId, userId })
  }

  async linkRequestsToUser(userEmail: string, userId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.linkToUser.execute({ userEmail, userId })
  }

  async shareRequestToTeamChat(requestId: string, userId: string): Promise<RequestTeamChatMessage> {
    const useCases = await this.getUseCases()
    return await useCases.shareToTeamChat.execute({ requestId, userId })
  }

  async assignRequestToMember(
    requestId: string,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.assign.execute({ requestId, assignedToId, assignedById })
  }

  async reassignRequestToMember(
    requestId: string,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.reassign.execute({ requestId, assignedToId, assignedById })
  }

  async unassignRequest(requestId: string, unassignedById: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.unassign.execute({ requestId, unassignedById })
  }

  async getAssignedRequests(
    userId: string,
    organizationId: string,
    filters?: RequestFilters
  ): Promise<Request[]> {
    const useCases = await this.getUseCases()
    return await useCases.listAssigned.execute({ userId, organizationId, filters })
  }

  async getUnassignedRequests(
    organizationId: string,
    filters?: RequestFilters
  ): Promise<Request[]> {
    const useCases = await this.getUseCases()
    return await useCases.listUnassigned.execute({ organizationId, filters })
  }

  async canPerformRequestActions(requestId: string, userId: string): Promise<boolean> {
    const useCases = await this.getUseCases()
    return await useCases.checkActionPermission.execute({ requestId, userId })
  }

  async canAssignRequests(organizationId: string, userId: string): Promise<boolean> {
    const useCases = await this.getUseCases()
    return await useCases.checkAssignmentPermission.execute({ organizationId, userId })
  }

  async canViewAssignedRequests(requestId: string, userId: string): Promise<boolean> {
    const useCases = await this.getUseCases()
    return await useCases.checkViewPermission.execute({ requestId, userId })
  }

  async getRequestOrganizationId(requestId: string): Promise<string | null> {
    const useCases = await this.getUseCases()
    return await useCases.resolveRequestOrganization.execute({ requestId })
  }

  async resolveAccessibleRequestById(requestId: string, userId: string): Promise<string | null> {
    const useCases = await this.getUseCases()
    return await useCases.resolveAccessibleRequestById.execute({ requestId, userId })
  }

  async resolveAccessibleRequestByNumber(
    requestNumber: string,
    userId: string
  ): Promise<string | null> {
    const useCases = await this.getUseCases()
    return await useCases.resolveAccessibleRequestByNumber.execute({ requestNumber, userId })
  }

  async isRequestToUserOrganization(userId: string, organizationId: string): Promise<boolean> {
    const useCases = await this.getUseCases()
    return await useCases.checkReceiverMembership.execute({ userId, organizationId })
  }

  private async getUseCases(): Promise<RequestUseCaseContainer> {
    return this.injectedUseCases ?? (await getRequestUseCases())
  }
}

export const requestsApplicationService = new RequestsApplicationService()
