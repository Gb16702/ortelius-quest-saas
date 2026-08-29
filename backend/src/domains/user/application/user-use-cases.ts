import { requireUserStatus } from '../domain'
import type { UserRepositoryPort, UserStatusNotifierPort } from './ports'

export class UpdateUserNameUseCase {
  constructor(private readonly users: UserRepositoryPort) {}

  async execute(command: { userId: string; name: string }): Promise<{ name: string }> {
    await this.users.updateUserName(command.userId, command.name)
    return { name: command.name }
  }
}

export class GetUserProfileUseCase {
  constructor(private readonly users: UserRepositoryPort) {}

  async execute(command: { userId: string }) {
    return await this.users.getUserProfile(command.userId)
  }
}

export class UpdateUserStatusUseCase {
  constructor(private readonly statusNotifier: UserStatusNotifierPort) {}

  async execute(command: { userId: string; status: string }) {
    const status = requireUserStatus(command.status)
    await this.statusNotifier.notifyStatusUpdated(command.userId, status)
    return { status }
  }
}
