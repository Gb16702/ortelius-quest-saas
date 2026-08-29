import type {
  AcceptInvitationResult,
  InvitationFilterOptions,
  InvitationListResponse,
  InvitationOperationResult,
  OrganizationInvitation,
} from './application/invitation-models'
import { getInvitationUseCases } from './infrastructure/invitation-use-cases'

export class InvitationApplicationService {
  private async getUseCases() {
    return await getInvitationUseCases()
  }

  async getInvitations(
    organizationId: string,
    userId: string,
    options?: InvitationFilterOptions
  ): Promise<InvitationListResponse> {
    const useCases = await this.getUseCases()
    return await useCases.list.execute({ organizationId, userId, options })
  }

  async getInvitationDetails(invitationId: string): Promise<OrganizationInvitation | null> {
    const useCases = await this.getUseCases()
    return await useCases.getDetails.execute({ invitationId })
  }

  async resendInvitation(invitationId: string, userId: string): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.resend.execute({ invitationId, userId })
  }

  async updateInvitationRole(
    invitationId: string,
    userId: string,
    role: string
  ): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.updateRole.execute({ invitationId, userId, role })
  }

  async archiveInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.archive.execute({ invitationIds, userId, organizationId })
  }

  async unarchiveInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.unarchive.execute({ invitationIds, userId, organizationId })
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.cancel.execute({ invitationId, userId })
  }

  async cancelInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.cancelBulk.execute({ invitationIds, userId, organizationId })
  }

  async createInvitation(
    email: string,
    role: string,
    organizationId: string,
    inviterId: string
  ): Promise<InvitationOperationResult> {
    const useCases = await this.getUseCases()
    return await useCases.create.execute({ email, role, organizationId, inviterId })
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string
  ): Promise<AcceptInvitationResult> {
    const useCases = await this.getUseCases()
    return await useCases.accept.execute({ invitationId, userId, userEmail })
  }
}

export const invitationApplicationService = new InvitationApplicationService()
