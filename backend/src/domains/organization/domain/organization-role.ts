export const ORGANIZATION_ROLE_LEVELS = {
  member: 1,
  admin: 2,
  owner: 3,
} as const

export type OrganizationRole = keyof typeof ORGANIZATION_ROLE_LEVELS

export function hasRequiredOrganizationRole(role: string, requiredRole: OrganizationRole): boolean {
  const userRoleLevel = ORGANIZATION_ROLE_LEVELS[role as OrganizationRole] ?? 0
  const requiredRoleLevel = ORGANIZATION_ROLE_LEVELS[requiredRole]
  return userRoleLevel >= requiredRoleLevel
}
