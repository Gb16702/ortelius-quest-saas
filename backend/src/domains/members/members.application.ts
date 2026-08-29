import type { MemberProfileResponse } from './application/member-profile-models'
import { getMemberUseCases } from './infrastructure/member-use-cases'

export class MembersApplicationService {
  async getMemberProfile(userId: string, requestingUserId: string): Promise<MemberProfileResponse> {
    const useCases = await getMemberUseCases()
    return await useCases.getProfile.execute({ userId, requestingUserId })
  }
}

export const membersApplicationService = new MembersApplicationService()
