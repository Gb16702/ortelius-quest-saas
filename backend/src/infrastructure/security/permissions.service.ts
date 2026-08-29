/**
 * Role-based permission definitions.
 * Better Auth access control has been removed. Permissions are now checked
 * directly via Drizzle queries against the member table.
 *
 * This file is kept for reference but is no longer imported anywhere.
 */

export const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
}

export function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole]
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  if (userLevel === undefined || requiredLevel === undefined) return false
  return userLevel >= requiredLevel
}
