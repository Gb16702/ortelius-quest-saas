import { getUserUseCases } from './infrastructure/user-use-cases'

export class UserApplicationService {
  async updateUserName(userId: string, name: string): Promise<{ name: string }> {
    const useCases = await getUserUseCases()
    return await useCases.updateName.execute({ userId, name })
  }

  async getUserProfile(userId: string) {
    const useCases = await getUserUseCases()
    return await useCases.getProfile.execute({ userId })
  }

  async updateUserStatus(userId: string, status: string) {
    const useCases = await getUserUseCases()
    return await useCases.updateStatus.execute({ userId, status })
  }
}

export const userApplicationService = new UserApplicationService()
