import { GraphQLError } from 'graphql'
import type { GraphQLContext } from '../../../../infrastructure/graphql/graphql.context'
import { authApplicationService } from '../../../auth/auth.application'

export const requireAuth = (context: GraphQLContext) => {
  if (!context.isAuthenticated || !context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return context.user
}

export const requireOrganizationMember = async (
  context: GraphQLContext,
  organizationId: string,
  requiredRole?: 'viewer' | 'member' | 'admin'
) => {
  const user = requireAuth(context)

  const membership = await authApplicationService.getUserOrganizationMembership(
    user.id,
    organizationId
  )

  if (!membership) {
    throw new GraphQLError('You are not a member of this organization', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  if (requiredRole && !authApplicationService.hasRequiredRole(membership.role, requiredRole)) {
    throw new GraphQLError(`This action requires ${requiredRole} role or higher`, {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return { user, membership }
}

export const canAccessMemberMetrics = async (
  context: GraphQLContext,
  targetUserId: string,
  organizationId: string
): Promise<{ user: ReturnType<typeof requireAuth>; canAccess: boolean; isAdmin: boolean }> => {
  const user = requireAuth(context)

  if (user.id === targetUserId) {
    return { user, canAccess: true, isAdmin: false }
  }

  const membership = await authApplicationService.getUserOrganizationMembership(
    user.id,
    organizationId
  )

  if (!membership) {
    throw new GraphQLError('You are not a member of this organization', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  const isAdmin = authApplicationService.hasRequiredRole(membership.role, 'admin')

  if (!isAdmin) {
    throw new GraphQLError('You can only view your own metrics or be an admin to view others', {
      extensions: { code: 'FORBIDDEN' },
    })
  }

  return { user, canAccess: true, isAdmin: true }
}

export const requireOrganizationAdmin = async (context: GraphQLContext, organizationId: string) => {
  return await requireOrganizationMember(context, organizationId, 'admin')
}

export const optionalAuth = (context: GraphQLContext) => {
  return context.isAuthenticated ? context.user : null
}
