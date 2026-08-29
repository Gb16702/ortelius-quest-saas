import {
  assertCanChangeOrganizationMemberRole,
  assertCanLeaveOrganization,
  assertCanRemoveOrganizationMember,
  hasRequiredOrganizationRole,
} from '../domain'
import { OrganizationNotFoundError, OrganizationPermissionError } from './organization-errors'
import type {
  OrganizationMemberActivityPort,
  OrganizationMemberMutationRepositoryPort,
  OrganizationMemberNotificationPort,
  OrganizationMembershipQueryPort,
  OrganizationSeatReconciliationPort,
} from './ports'

export class UpdateOrganizationMemberRoleUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly members: OrganizationMemberMutationRepositoryPort,
    private readonly activity: OrganizationMemberActivityPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    memberId: string
    role: 'admin' | 'member'
  }): Promise<{ id: string; role: string }> {
    await this.assertCanManageMembers(command.actorId, command.organizationId)

    const target = await this.members.findMemberForRoleUpdate(
      command.organizationId,
      command.memberId
    )
    if (!target) {
      throw new OrganizationNotFoundError('Member not found')
    }

    assertCanChangeOrganizationMemberRole({ callerId: command.actorId, target })

    if (target.role === command.role) {
      return { id: target.id, role: target.role }
    }

    await this.members.updateMemberRole(command.memberId, command.role)
    void this.activity.logMemberRoleUpdated({
      organizationId: command.organizationId,
      actorId: command.actorId,
      memberId: command.memberId,
      targetUserId: target.userId,
      targetUserName: target.userName,
      previousRole: target.role,
      newRole: command.role,
    })

    return { id: target.id, role: command.role }
  }

  private async assertCanManageMembers(actorId: string, organizationId: string): Promise<void> {
    const membership = await this.memberships.findMembership(actorId, organizationId)
    if (!membership || !hasRequiredOrganizationRole(membership.role, 'admin')) {
      throw new OrganizationPermissionError()
    }
  }
}

export class RemoveOrganizationMemberUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly members: OrganizationMemberMutationRepositoryPort,
    private readonly activity: OrganizationMemberActivityPort,
    private readonly notifications: OrganizationMemberNotificationPort,
    private readonly seats: OrganizationSeatReconciliationPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    memberId: string
  }): Promise<void> {
    await this.assertCanManageMembers(command.actorId, command.organizationId)

    const target = await this.members.findMemberForRemoval(command.organizationId, command.memberId)
    if (!target) {
      throw new OrganizationNotFoundError('Member not found')
    }

    assertCanRemoveOrganizationMember({ callerId: command.actorId, target })

    await this.members.removeMemberAndUnassignRequests({
      organizationId: command.organizationId,
      memberId: command.memberId,
      userId: target.userId,
    })

    void this.activity.logMemberRemoved({
      organizationId: command.organizationId,
      actorId: command.actorId,
      member: target,
    })
    void this.seats.reconcileSeats(command.organizationId)
    void this.notifications.notifyMemberRemoved({
      organizationId: command.organizationId,
      member: target,
    })
  }

  private async assertCanManageMembers(actorId: string, organizationId: string): Promise<void> {
    const membership = await this.memberships.findMembership(actorId, organizationId)
    if (!membership || !hasRequiredOrganizationRole(membership.role, 'admin')) {
      throw new OrganizationPermissionError()
    }
  }
}

export class LeaveOrganizationUseCase {
  constructor(
    private readonly members: OrganizationMemberMutationRepositoryPort,
    private readonly activity: OrganizationMemberActivityPort,
    private readonly notifications: OrganizationMemberNotificationPort,
    private readonly seats: OrganizationSeatReconciliationPort
  ) {}

  async execute(command: { organizationId: string; actorId: string }): Promise<void> {
    const membership = await this.members.findLeavingMember(command.organizationId, command.actorId)
    if (!membership) {
      throw new OrganizationNotFoundError('Membership not found')
    }

    assertCanLeaveOrganization(membership.role)

    await this.members.leaveOrganizationAndUnassignRequests({
      organizationId: command.organizationId,
      userId: command.actorId,
    })

    void this.activity.logMemberLeft({
      organizationId: command.organizationId,
      actorId: command.actorId,
      member: membership,
    })
    void this.seats.reconcileSeats(command.organizationId)
    void this.notifications.notifyMemberLeft({
      organizationId: command.organizationId,
      userId: command.actorId,
      member: membership,
    })
  }
}
