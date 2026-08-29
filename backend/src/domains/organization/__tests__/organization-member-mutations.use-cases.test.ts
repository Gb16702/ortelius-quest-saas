import { describe, expect, it, mock } from 'bun:test'
import {
  LeaveOrganizationUseCase,
  RemoveOrganizationMemberUseCase,
  UpdateOrganizationMemberRoleUseCase,
} from '../application/organization-member-mutations.use-cases'
import type {
  OrganizationMemberActivityPort,
  OrganizationMemberMutationRepositoryPort,
  OrganizationMemberNotificationPort,
  OrganizationMembershipQueryPort,
  OrganizationSeatReconciliationPort,
} from '../application/ports'

function createMemberships(role: string | null): OrganizationMembershipQueryPort {
  return {
    findMembership: mock(async () =>
      role
        ? {
            id: 'caller-member',
            role,
            organizationId: 'org-1',
            userId: 'admin-user',
          }
        : null
    ),
  }
}

function createMemberRepository(): OrganizationMemberMutationRepositoryPort {
  return {
    findMemberForRoleUpdate: mock(async () => ({
      id: 'member-1',
      userId: 'target-user',
      role: 'member',
      userName: 'Target User',
    })),
    updateMemberRole: mock(async () => undefined),
    findMemberForRemoval: mock(async () => ({
      id: 'member-1',
      userId: 'target-user',
      role: 'member',
      userName: 'Target User',
      userEmail: 'target@example.com',
      organizationName: 'Ortelius',
    })),
    removeMemberAndUnassignRequests: mock(async () => undefined),
    findLeavingMember: mock(async () => ({
      role: 'member',
      userName: 'Leaving User',
      userEmail: 'leaving@example.com',
      organizationName: 'Ortelius',
    })),
    leaveOrganizationAndUnassignRequests: mock(async () => undefined),
  }
}

function createActivity(): OrganizationMemberActivityPort {
  return {
    logMemberRoleUpdated: mock(async () => undefined),
    logMemberRemoved: mock(async () => undefined),
    logMemberLeft: mock(async () => undefined),
  }
}

function createNotifications(): OrganizationMemberNotificationPort {
  return {
    notifyMemberRemoved: mock(async () => undefined),
    notifyMemberLeft: mock(async () => undefined),
  }
}

function createSeats(): OrganizationSeatReconciliationPort {
  return {
    reconcileSeats: mock(async () => undefined),
  }
}

describe('Organization member mutation use cases', () => {
  it('updates a member role after admin membership and domain checks', async () => {
    const memberships = createMemberships('admin')
    const members = createMemberRepository()
    const activity = createActivity()
    const useCase = new UpdateOrganizationMemberRoleUseCase(memberships, members, activity)

    const result = await useCase.execute({
      organizationId: 'org-1',
      actorId: 'admin-user',
      memberId: 'member-1',
      role: 'admin',
    })

    expect(result).toEqual({ id: 'member-1', role: 'admin' })
    expect(memberships.findMembership).toHaveBeenCalledWith('admin-user', 'org-1')
    expect(members.updateMemberRole).toHaveBeenCalledWith('member-1', 'admin')
    expect(activity.logMemberRoleUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        actorId: 'admin-user',
        previousRole: 'member',
        newRole: 'admin',
      })
    )
  })

  it('rejects member role updates for non-admin actors before loading the target', async () => {
    const members = createMemberRepository()
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      createMemberships('member'),
      members,
      createActivity()
    )

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        actorId: 'member-user',
        memberId: 'member-1',
        role: 'admin',
      })
    ).rejects.toThrow('Insufficient permissions. Admin or Owner role required')
    expect(members.findMemberForRoleUpdate).not.toHaveBeenCalled()
  })

  it('removes a member and runs cleanup side effects', async () => {
    const members = createMemberRepository()
    const activity = createActivity()
    const notifications = createNotifications()
    const seats = createSeats()
    const useCase = new RemoveOrganizationMemberUseCase(
      createMemberships('owner'),
      members,
      activity,
      notifications,
      seats
    )

    await useCase.execute({
      organizationId: 'org-1',
      actorId: 'owner-user',
      memberId: 'member-1',
    })

    expect(members.removeMemberAndUnassignRequests).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-1',
      userId: 'target-user',
    })
    expect(activity.logMemberRemoved).toHaveBeenCalled()
    expect(seats.reconcileSeats).toHaveBeenCalledWith('org-1')
    expect(notifications.notifyMemberRemoved).toHaveBeenCalled()
  })

  it('blocks owners from leaving their organization', async () => {
    const members = createMemberRepository()
    members.findLeavingMember = mock(async () => ({
      role: 'owner',
      userName: 'Owner User',
      userEmail: 'owner@example.com',
      organizationName: 'Ortelius',
    }))
    const useCase = new LeaveOrganizationUseCase(
      members,
      createActivity(),
      createNotifications(),
      createSeats()
    )

    await expect(
      useCase.execute({ organizationId: 'org-1', actorId: 'owner-user' })
    ).rejects.toThrow('Owners must transfer ownership before leaving')
    expect(members.leaveOrganizationAndUnassignRequests).not.toHaveBeenCalled()
  })

  it('lets a regular member leave and triggers cleanup side effects', async () => {
    const members = createMemberRepository()
    const activity = createActivity()
    const notifications = createNotifications()
    const seats = createSeats()
    const useCase = new LeaveOrganizationUseCase(members, activity, notifications, seats)

    await useCase.execute({ organizationId: 'org-1', actorId: 'member-user' })

    expect(members.leaveOrganizationAndUnassignRequests).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'member-user',
    })
    expect(activity.logMemberLeft).toHaveBeenCalled()
    expect(seats.reconcileSeats).toHaveBeenCalledWith('org-1')
    expect(notifications.notifyMemberLeft).toHaveBeenCalled()
  })
})
