export const INVITATION_ROLES = ['member', 'admin', 'owner'] as const
export type InvitationRole = (typeof INVITATION_ROLES)[number]

export const INVITATION_STATUSES = ['pending', 'accepted', 'canceled'] as const
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

const roleHierarchy: Record<InvitationRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
}

export function isInvitationRole(role: string): role is InvitationRole {
  return INVITATION_ROLES.includes(role as InvitationRole)
}

export function requireInvitationRole(role: string): InvitationRole {
  if (!isInvitationRole(role)) {
    throw new Error('Invalid role. Must be one of: member, admin, owner')
  }

  return role
}

export function assertCanAssignInvitationRole(
  actorRole: string | undefined,
  targetRole: string,
  message = 'Admin cannot assign owner role'
) {
  const target = requireInvitationRole(targetRole)

  if (actorRole === 'admin' && target === 'owner') {
    throw new Error(message)
  }
}

export function hasAtLeastInvitationRole(
  actualRole: string | undefined,
  requiredRole: InvitationRole
): boolean {
  return (roleHierarchy[actualRole as InvitationRole] || 0) >= roleHierarchy[requiredRole]
}

export function assertPendingInvitation(status: string, message: string) {
  if (status !== 'pending') {
    throw new Error(message)
  }
}
