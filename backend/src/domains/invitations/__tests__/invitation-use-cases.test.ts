import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  CreateInvitationUseCase,
  GetInvitationDetailsUseCase,
  UpdateInvitationRoleUseCase,
} from '../application/invitation-use-cases'
import type { InvitationRepositoryPort } from '../application/ports'
import { assertCanAssignInvitationRole, requireInvitationRole } from '../domain'

function createInvitationRepository(): InvitationRepositoryPort {
  return {
    getInvitations: mock(),
    getInvitationDetails: mock(),
    resendInvitation: mock(),
    updateInvitationRole: mock(),
    archiveInvitations: mock(),
    unarchiveInvitations: mock(),
    cancelInvitation: mock(),
    cancelInvitations: mock(),
    createInvitation: mock(),
    acceptInvitation: mock(),
  }
}

describe('Invitation domain policy', () => {
  it('accepts supported invitation roles', () => {
    expect(requireInvitationRole('member')).toBe('member')
    expect(requireInvitationRole('admin')).toBe('admin')
    expect(requireInvitationRole('owner')).toBe('owner')
  })

  it('rejects unsupported invitation roles', () => {
    expect(() => requireInvitationRole('super-admin')).toThrow(
      'Invalid role. Must be one of: member, admin, owner'
    )
  })

  it('prevents admins from assigning owner invitations', () => {
    expect(() => assertCanAssignInvitationRole('admin', 'owner')).toThrow(
      'Admin cannot assign owner role'
    )
  })
})

describe('Invitation use cases', () => {
  let invitations: InvitationRepositoryPort

  beforeEach(() => {
    invitations = createInvitationRepository()
  })

  it('delegates invitation detail lookup through the application port', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'user@example.com',
      role: 'member',
      status: 'pending',
      archived: false,
      expiresAt: new Date(),
      inviterId: 'inviter-1',
    }
    invitations.getInvitationDetails = mock(() => Promise.resolve(invitation))

    const result = await new GetInvitationDetailsUseCase(invitations).execute({
      invitationId: 'invitation-1',
    })

    expect(result).toBe(invitation)
    expect(invitations.getInvitationDetails).toHaveBeenCalledWith('invitation-1')
  })

  it('validates roles before updating an invitation', async () => {
    invitations.updateInvitationRole = mock(() =>
      Promise.resolve({ success: true, message: 'Invitation role updated successfully' })
    )

    await expect(
      new UpdateInvitationRoleUseCase(invitations).execute({
        invitationId: 'invitation-1',
        userId: 'user-1',
        role: 'invalid',
      })
    ).rejects.toThrow('Invalid role. Must be one of: member, admin, owner')

    expect(invitations.updateInvitationRole).not.toHaveBeenCalled()
  })

  it('passes normalized create invitation commands to infrastructure', async () => {
    invitations.createInvitation = mock(() =>
      Promise.resolve({
        success: true,
        message: 'Invitation sent successfully',
        invitationId: 'invitation-1',
      })
    )

    const result = await new CreateInvitationUseCase(invitations).execute({
      email: 'user@example.com',
      role: 'admin',
      organizationId: 'org-1',
      inviterId: 'inviter-1',
    })

    expect(result.invitationId).toBe('invitation-1')
    expect(invitations.createInvitation).toHaveBeenCalledWith({
      email: 'user@example.com',
      role: 'admin',
      organizationId: 'org-1',
      inviterId: 'inviter-1',
    })
  })
})
