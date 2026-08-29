import { requireInvitationRole } from '../domain'
import type {
  AcceptInvitationResult,
  CreateInvitationCommand,
  InvitationFilterOptions,
  InvitationListResponse,
  InvitationOperationResult,
  OrganizationInvitation,
} from './invitation-models'
import type { InvitationRepositoryPort } from './ports'

export class ListInvitationsUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    organizationId: string
    userId: string
    options?: InvitationFilterOptions
  }): Promise<InvitationListResponse> {
    return await this.invitations.getInvitations(
      command.organizationId,
      command.userId,
      command.options
    )
  }
}

export class GetInvitationDetailsUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: { invitationId: string }): Promise<OrganizationInvitation | null> {
    return await this.invitations.getInvitationDetails(command.invitationId)
  }
}

export class ResendInvitationUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationId: string
    userId: string
  }): Promise<InvitationOperationResult> {
    return await this.invitations.resendInvitation(command.invitationId, command.userId)
  }
}

export class UpdateInvitationRoleUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationId: string
    userId: string
    role: string
  }): Promise<InvitationOperationResult> {
    const role = requireInvitationRole(command.role)
    return await this.invitations.updateInvitationRole(command.invitationId, command.userId, role)
  }
}

export class ArchiveInvitationsUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationIds: string[]
    userId: string
    organizationId: string
  }): Promise<InvitationOperationResult> {
    return await this.invitations.archiveInvitations(
      command.invitationIds,
      command.userId,
      command.organizationId
    )
  }
}

export class UnarchiveInvitationsUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationIds: string[]
    userId: string
    organizationId: string
  }): Promise<InvitationOperationResult> {
    return await this.invitations.unarchiveInvitations(
      command.invitationIds,
      command.userId,
      command.organizationId
    )
  }
}

export class CancelInvitationUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationId: string
    userId: string
  }): Promise<InvitationOperationResult> {
    return await this.invitations.cancelInvitation(command.invitationId, command.userId)
  }
}

export class CancelInvitationsUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationIds: string[]
    userId: string
    organizationId: string
  }): Promise<InvitationOperationResult> {
    return await this.invitations.cancelInvitations(
      command.invitationIds,
      command.userId,
      command.organizationId
    )
  }
}

export class CreateInvitationUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: CreateInvitationCommand): Promise<InvitationOperationResult> {
    const role = requireInvitationRole(command.role)
    return await this.invitations.createInvitation({ ...command, role })
  }
}

export class AcceptInvitationUseCase {
  constructor(private readonly invitations: InvitationRepositoryPort) {}

  async execute(command: {
    invitationId: string
    userId: string
    userEmail: string
  }): Promise<AcceptInvitationResult> {
    return await this.invitations.acceptInvitation(
      command.invitationId,
      command.userId,
      command.userEmail
    )
  }
}
