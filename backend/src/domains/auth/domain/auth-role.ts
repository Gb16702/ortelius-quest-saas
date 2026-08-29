export const authRoleHierarchy = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
} as const

export type AuthRole = keyof typeof authRoleHierarchy
export type RoleHierarchy = Record<string, number>

export function isAuthRole(role: string): role is AuthRole {
  return role in authRoleHierarchy
}

export function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  if (!isAuthRole(userRole) || !isAuthRole(requiredRole)) {
    return false
  }

  return authRoleHierarchy[userRole] >= authRoleHierarchy[requiredRole]
}

export function getRoleHierarchy(): RoleHierarchy {
  return { ...authRoleHierarchy }
}
