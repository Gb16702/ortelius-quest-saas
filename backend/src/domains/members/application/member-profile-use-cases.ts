import {
  MemberProfileNotFoundError,
  MemberProfilePermissionError,
  normalizeMemberRole,
} from '../domain'
import type { MemberProfileResponse } from './member-profile-models'
import type { MemberProfileRepositoryPort } from './ports'

export class GetMemberProfileUseCase {
  constructor(private readonly members: MemberProfileRepositoryPort) {}

  async execute(command: {
    userId: string
    requestingUserId: string
  }): Promise<MemberProfileResponse> {
    const requestingUserMembership = await this.members.findMembershipByUserId(
      command.requestingUserId
    )

    if (!requestingUserMembership) {
      throw new MemberProfilePermissionError('Requesting user is not a member of any organization')
    }

    const targetUserMembership = await this.members.findMembershipInOrganization(
      command.userId,
      requestingUserMembership.organizationId
    )

    if (!targetUserMembership) {
      throw new MemberProfilePermissionError('Target user is not a member of the same organization')
    }

    const targetUser = await this.members.findUserById(command.userId)

    if (!targetUser) {
      throw new MemberProfileNotFoundError('User not found')
    }

    const assignedRequests = await this.members.listAssignedRequests(
      command.userId,
      targetUserMembership.organizationId
    )

    return {
      user: targetUser,
      membership: {
        id: targetUserMembership.id,
        organizationId: targetUserMembership.organizationId,
        role: normalizeMemberRole(targetUserMembership.role),
        joinedAt: targetUserMembership.joinedAt,
      },
      assignedRequests,
    }
  }
}
