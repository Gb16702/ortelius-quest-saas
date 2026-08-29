import type {
  MemberProfileAssignedRequest,
  MemberProfileMembershipRecord,
  MemberProfileUser,
} from './member-profile-models'

export interface MemberProfileRepositoryPort {
  findMembershipByUserId(userId: string): Promise<MemberProfileMembershipRecord | null>
  findMembershipInOrganization(
    userId: string,
    organizationId: string
  ): Promise<MemberProfileMembershipRecord | null>
  findUserById(userId: string): Promise<MemberProfileUser | null>
  listAssignedRequests(
    userId: string,
    organizationId: string
  ): Promise<MemberProfileAssignedRequest[]>
}
