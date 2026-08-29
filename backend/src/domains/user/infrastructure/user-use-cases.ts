import {
  GetUserProfileUseCase,
  UpdateUserNameUseCase,
  UpdateUserStatusUseCase,
} from '../application/user-use-cases'
import { DrizzleUserRepository } from './user.repository'
import { WebsocketUserStatusNotifier } from './user-status-notifier.adapter'

let userUseCases: {
  updateName: UpdateUserNameUseCase
  getProfile: GetUserProfileUseCase
  updateStatus: UpdateUserStatusUseCase
} | null = null

export async function getUserUseCases() {
  if (!userUseCases) {
    const users = new DrizzleUserRepository()
    const statusNotifier = new WebsocketUserStatusNotifier()

    userUseCases = {
      updateName: new UpdateUserNameUseCase(users),
      getProfile: new GetUserProfileUseCase(users),
      updateStatus: new UpdateUserStatusUseCase(statusNotifier),
    }
  }

  return userUseCases
}
