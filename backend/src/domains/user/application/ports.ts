import type { UserProfile } from './user-models'

export interface UserRepositoryPort {
  updateUserName(userId: string, name: string): Promise<void>
  getUserProfile(userId: string): Promise<UserProfile | null>
}

export interface UserStatusNotifierPort {
  notifyStatusUpdated(userId: string, status: string): Promise<void> | void
}
