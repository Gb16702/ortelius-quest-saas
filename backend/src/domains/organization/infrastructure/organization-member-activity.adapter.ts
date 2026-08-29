import { activityApplicationService } from '../../activity/activity.application'
import type {
  OrganizationLeavingMember,
  OrganizationMemberActivityPort,
  OrganizationMemberRemoval,
} from '../application/ports'

export class ActivityOrganizationMemberAdapter implements OrganizationMemberActivityPort {
  async logMemberRoleUpdated(input: {
    organizationId: string
    actorId: string
    memberId: string
    targetUserId: string
    targetUserName: string
    previousRole: string
    newRole: 'admin' | 'member'
  }): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: 'member-role-updated',
      description: `updated ${input.targetUserName}'s role to ${input.newRole}`,
      metadata: {
        memberId: input.memberId,
        userId: input.targetUserId,
        previousRole: input.previousRole,
        role: input.newRole,
      },
    })
  }

  async logMemberRemoved(input: {
    organizationId: string
    actorId: string
    member: OrganizationMemberRemoval
  }): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: 'member-removed',
      description: `removed ${input.member.userName} from the organization`,
      metadata: {
        memberId: input.member.id,
        userId: input.member.userId,
        userName: input.member.userName,
        userEmail: input.member.userEmail,
        role: input.member.role,
      },
    })
  }

  async logMemberLeft(input: {
    organizationId: string
    actorId: string
    member: OrganizationLeavingMember
  }): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: 'member-left',
      description: 'left the organization',
      metadata: {
        userId: input.actorId,
        userName: input.member.userName,
        userEmail: input.member.userEmail,
        role: input.member.role,
      },
    })
  }
}
