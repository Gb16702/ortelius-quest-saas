export type MemberRole = 'owner' | 'admin' | 'member'

export class MemberProfilePermissionError extends Error {
  override readonly name = 'MemberProfilePermissionError'
}

export class MemberProfileNotFoundError extends Error {
  override readonly name = 'MemberProfileNotFoundError'
}

export function normalizeMemberRole(role: string): MemberRole {
  if (role === 'owner' || role === 'admin' || role === 'member') {
    return role
  }

  throw new Error(`Unsupported member role: ${role}`)
}
