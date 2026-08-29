import {
  AcceptInvitationUseCase,
  ArchiveInvitationsUseCase,
  CancelInvitationsUseCase,
  CancelInvitationUseCase,
  CreateInvitationUseCase,
  GetInvitationDetailsUseCase,
  ListInvitationsUseCase,
  ResendInvitationUseCase,
  UnarchiveInvitationsUseCase,
  UpdateInvitationRoleUseCase,
} from '../application/invitation-use-cases'

export interface InvitationUseCaseContainer {
  list: ListInvitationsUseCase
  getDetails: GetInvitationDetailsUseCase
  resend: ResendInvitationUseCase
  updateRole: UpdateInvitationRoleUseCase
  archive: ArchiveInvitationsUseCase
  unarchive: UnarchiveInvitationsUseCase
  cancel: CancelInvitationUseCase
  cancelBulk: CancelInvitationsUseCase
  create: CreateInvitationUseCase
  accept: AcceptInvitationUseCase
}

let invitationUseCases: InvitationUseCaseContainer | null = null

export async function getInvitationUseCases(): Promise<InvitationUseCaseContainer> {
  if (invitationUseCases) return invitationUseCases

  const { DrizzleInvitationsService } = await import('./invitations.service')
  const invitations = new DrizzleInvitationsService()
  invitationUseCases = {
    list: new ListInvitationsUseCase(invitations),
    getDetails: new GetInvitationDetailsUseCase(invitations),
    resend: new ResendInvitationUseCase(invitations),
    updateRole: new UpdateInvitationRoleUseCase(invitations),
    archive: new ArchiveInvitationsUseCase(invitations),
    unarchive: new UnarchiveInvitationsUseCase(invitations),
    cancel: new CancelInvitationUseCase(invitations),
    cancelBulk: new CancelInvitationsUseCase(invitations),
    create: new CreateInvitationUseCase(invitations),
    accept: new AcceptInvitationUseCase(invitations),
  }

  return invitationUseCases
}
