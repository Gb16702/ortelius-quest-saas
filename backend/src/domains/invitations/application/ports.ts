import type {
  AcceptInvitationResult,
  CreateInvitationCommand,
  InvitationFilterOptions,
  InvitationListResponse,
  InvitationOperationResult,
  OrganizationInvitation,
} from './invitation-models'

export interface InvitationRepositoryPort {
  getInvitations(
    organizationId: string,
    userId: string,
    options?: InvitationFilterOptions
  ): Promise<InvitationListResponse>
  getInvitationDetails(invitationId: string): Promise<OrganizationInvitation | null>
  resendInvitation(invitationId: string, userId: string): Promise<InvitationOperationResult>
  updateInvitationRole(
    invitationId: string,
    userId: string,
    newRole: string
  ): Promise<InvitationOperationResult>
  archiveInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult>
  unarchiveInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult>
  cancelInvitation(invitationId: string, userId: string): Promise<InvitationOperationResult>
  cancelInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult>
  createInvitation(command: CreateInvitationCommand): Promise<InvitationOperationResult>
  acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string
  ): Promise<AcceptInvitationResult>
}
