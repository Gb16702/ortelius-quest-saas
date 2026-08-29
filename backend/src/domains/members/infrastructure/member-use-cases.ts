import { GetMemberProfileUseCase } from '../application/member-profile-use-cases'
import { DrizzleMemberProfileRepository } from './member-profile.repository'

export interface MemberUseCaseContainer {
  getProfile: GetMemberProfileUseCase
}

let memberUseCases: MemberUseCaseContainer | null = null

export async function getMemberUseCases(): Promise<MemberUseCaseContainer> {
  if (memberUseCases) return memberUseCases

  const members = new DrizzleMemberProfileRepository()
  memberUseCases = {
    getProfile: new GetMemberProfileUseCase(members),
  }

  return memberUseCases
}
