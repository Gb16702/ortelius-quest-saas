import type { Context, Next } from 'hono'
import type { AuthUser } from '../../domains/auth/application/auth-models'
import { authApplicationService } from '../../domains/auth/auth.application'
import {
  throwForbidden,
  throwNotFound,
  throwUnauthorized,
  throwValidationError,
} from '../monitoring/error-handler.service'

export const requireAuth = async (c: Context, next: Next) => {
  const user = c.get('user') as AuthUser | undefined

  if (!user) {
    throwUnauthorized('Authentication required')
  }

  await next()
}

export const requireOrganizationMember = (requiredRole?: 'admin' | 'member' | 'viewer') => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined
    const organizationId = c.req.param('organizationId') || c.req.param('orgId')

    if (!user) {
      throwUnauthorized('Authentication required')
    }

    if (!organizationId) {
      throwValidationError('Organization ID is required')
    }

    const authenticatedUser = user as AuthUser

    const userMembership = await authApplicationService.getUserOrganizationMembership(
      authenticatedUser.id,
      organizationId!
    )

    if (!userMembership) {
      throwForbidden('You are not a member of this organization')
    }

    if (
      requiredRole &&
      !authApplicationService.hasRequiredRole(userMembership!.role, requiredRole)
    ) {
      throwForbidden(`This action requires ${requiredRole} role or higher`)
    }

    c.set('membership', userMembership)
    c.set('organizationId', organizationId)

    await next()
  }
}

export const requireOrganizationAdmin = requireOrganizationMember('admin')

export const requireResourceOwner = (resourceUserIdParam = 'userId') => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined
    const resourceUserId = c.req.param(resourceUserIdParam)

    if (!user) {
      throwUnauthorized('Authentication required')
    }

    if (!resourceUserId) {
      throwValidationError(`${resourceUserIdParam} parameter is required`)
    }

    const authenticatedUser = user as AuthUser

    if (authenticatedUser.id !== resourceUserId) {
      throwForbidden('You can only access your own resources')
    }

    await next()
  }
}

export const validateOrganizationExists = async (c: Context, next: Next) => {
  const organizationId = c.req.param('organizationId') || c.req.param('orgId')

  if (!organizationId) {
    throwValidationError('Organization ID is required')
  }

  const org = await authApplicationService.validateOrganizationExists(organizationId!)

  if (!org) {
    throwNotFound('Organization not found')
  }

  c.set('organization', org)

  await next()
}

export const optionalAuth = async (c: Context, next: Next) => {
  const user = c.get('user') as AuthUser | undefined
  c.set('isAuthenticated', !!user)
  await next()
}

export const requirePlatformAdmin = async (c: Context, next: Next) => {
  const user = c.get('user') as AuthUser | undefined

  if (!user) {
    throwUnauthorized('Authentication required')
  }

  const authenticatedUser = user as AuthUser

  if (authenticatedUser.role !== 'admin') {
    throwForbidden('Platform admin access required')
  }

  await next()
}
