export const USER_STATUSES = ['online', 'away', 'busy', 'offline'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export function requireUserStatus(status: string): UserStatus {
  if (USER_STATUSES.includes(status as UserStatus)) {
    return status as UserStatus
  }

  throw new Error('Invalid user status')
}
