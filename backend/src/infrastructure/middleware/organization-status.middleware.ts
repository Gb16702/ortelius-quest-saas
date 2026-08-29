import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { db } from '../database'
import { member, organization } from '../database/db/schemas/auth-schema'
import { createApiErrorResponse, ErrorCode } from '../types/api.types'

export async function requireActiveOrganization(c: Context, next: Next) {
  const organizationId = c.req.param('organizationId') || c.get('organizationId')

  if (!organizationId) {
    return c.json(
      createApiErrorResponse(ErrorCode.BAD_REQUEST, 'No organization context found'),
      400
    )
  }

  const org = await db
    .select({ status: organization.status, name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  if (org.length === 0) {
    return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Organization not found'), 404)
  }

  const orgStatus = org[0].status

  if (orgStatus === 'pending') {
    return c.json(
      createApiErrorResponse(
        ErrorCode.FORBIDDEN,
        'This organization is pending activation. Please subscribe to a plan to activate your organization.',
        {
          organizationStatus: 'pending',
          requiresSubscription: true,
        }
      ),
      403
    )
  }

  if (orgStatus === 'suspended') {
    return c.json(
      createApiErrorResponse(
        ErrorCode.FORBIDDEN,
        'This organization has been suspended. Please contact support or update your payment method.',
        {
          organizationStatus: 'suspended',
        }
      ),
      403
    )
  }

  if (orgStatus !== 'active') {
    return c.json(
      createApiErrorResponse(ErrorCode.FORBIDDEN, `Organization status is "${orgStatus}".`, {
        organizationStatus: orgStatus,
      }),
      403
    )
  }

  await next()
}

export async function allowPendingOrganizationAccess(c: Context, next: Next) {
  const organizationId = c.req.param('organizationId') || c.get('organizationId')

  if (!organizationId) {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Organization ID required'), 400)
  }

  const org = await db
    .select({ status: organization.status })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  if (org.length === 0) {
    return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Organization not found'), 404)
  }

  const orgStatus = org[0].status

  if (orgStatus === 'suspended') {
    return c.json(
      createApiErrorResponse(ErrorCode.FORBIDDEN, 'This organization has been suspended.', {
        organizationStatus: 'suspended',
      }),
      403
    )
  }

  await next()
}

export async function checkUserOrganizationStatus(c: Context, next: Next) {
  const session = c.get('session')
  const user = c.get('user')

  if (!session || !user) {
    await next()
    return
  }

  const path = c.req.path

  const allowedPaths = [
    '/api/auth',
    '/api/onboarding',
    '/api/subscription',
    '/api/organizations',
    '/api/categories',
    '/api/services',
    '/api/requests',
    '/api/documents',
    '/api/conversations',
    '/api/messages',
    '/api/ws',
    '/api/health',
    '/api/graphql',
    '/docs',
    '/doc',
  ]

  const isAllowedPath = allowedPaths.some((allowedPath) => path.startsWith(allowedPath))

  if (isAllowedPath) {
    await next()
    return
  }

  const userOrganizations = await db
    .select({
      organizationId: member.organizationId,
      organizationStatus: organization.status,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, user.id))
    .limit(1)

  if (userOrganizations.length === 0) {
    return c.json(
      createApiErrorResponse(ErrorCode.FORBIDDEN, 'Please create an organization first.', {
        requiresOrganization: true,
      }),
      403
    )
  }

  const userOrg = userOrganizations[0]

  if (userOrg.organizationStatus === 'pending') {
    return c.json(
      createApiErrorResponse(
        ErrorCode.PAYMENT_REQUIRED,
        'Your organization is pending activation. Please subscribe to a plan to continue.',
        {
          organizationStatus: 'pending',
          requiresSubscription: true,
        }
      ),
      402
    )
  }

  if (userOrg.organizationStatus === 'suspended') {
    return c.json(
      createApiErrorResponse(
        ErrorCode.PAYMENT_REQUIRED,
        'Your organization has been suspended. Please update your payment method.',
        {
          organizationStatus: 'suspended',
          requiresPaymentUpdate: true,
        }
      ),
      402
    )
  }

  await next()
}
