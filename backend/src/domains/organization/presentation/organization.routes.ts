import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import { env } from '../../../infrastructure/config/environment'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import {
  validateJson,
  validateParam,
  validateQuery,
} from '../../../infrastructure/validation/validation.utils'
import { activityApplicationService } from '../../activity/activity.application'
import { invitationApplicationService } from '../../invitations/invitations.application'
import {
  archiveInvitationsSchema,
  createInvitationSchema,
  invitationFilterQuerySchema,
  invitationIdParamSchema,
  updateInvitationRoleSchema,
} from '../../invitations/presentation/invitations.schemas'
import { trackNewVisitorMiddleware } from '../../metrics/middleware/metrics.middleware'
import { requestsApplicationService } from '../../requests/requests.application'
import { OrganizationSlugError } from '../application/organization-settings.use-cases'
import { BRAND_COLORS } from '../domain'
import { organizationApplicationService } from '../organization.application'
import {
  memberFilterQuerySchema,
  memberIdParamSchema,
  organizationIdParamSchema,
  organizationSlugParamSchema,
  requestFilterQuerySchema,
  sendShowcaseEmailsSchema,
  showcaseMetricsQuerySchema,
  updateEmailIntakeSchema,
  updateMemberRoleSchema,
  updateOrganizationSettingsSchema,
} from './organization.schemas'

const organization = new Hono<{ Variables: CommonVariables }>()

function shouldNotifyOrganizationRealtimeUpdate(settings: Record<string, unknown>): boolean {
  return (
    settings.name !== undefined ||
    settings.slug !== undefined ||
    settings.brandColor !== undefined ||
    settings.font !== undefined
  )
}

organization.get('/by-slug/:slug', validateParam(organizationSlugParamSchema), async (c) => {
  try {
    const { slug } = c.req.valid('param')
    const organizationData = await organizationApplicationService.getBySlug(slug)

    if (!organizationData) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.NOT_FOUND,
        'Organization not found'
      )
      return c.json(response, 404)
    }

    const response: ApiResponse<typeof organizationData> = {
      success: true,
      data: organizationData,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to fetch organization by slug'
    )
    return c.json(response, 500)
  }
})

organization.get(
  '/:slug/showcase',
  trackNewVisitorMiddleware,
  validateParam(organizationSlugParamSchema),
  validateQuery(showcaseMetricsQuerySchema),
  async (c) => {
    try {
      const { slug } = c.req.valid('param')
      const { days } = c.req.valid('query')
      const showcaseData = await organizationApplicationService.getShowcaseData(slug, days)

      const response: ApiResponse<typeof showcaseData> = {
        success: true,
        data: showcaseData,
      }
      return c.json(response, 200)
    } catch (error) {
      if (error instanceof Error && error.message === 'Organization not found') {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.NOT_FOUND,
          'Organization not found'
        )
        return c.json(response, 404)
      }

      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization showcase'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/dashboard',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateQuery(memberFilterQuerySchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const queryOptions = c.req.valid('query')
      const user = c.get('user')!

      const dashboard = await organizationApplicationService.getDashboard(
        organizationId,
        user.id,
        queryOptions
      )

      const response: ApiResponse<typeof dashboard> = {
        success: true,
        data: dashboard,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization dashboard'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/members',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateQuery(memberFilterQuerySchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const queryOptions = c.req.valid('query')
      const user = c.get('user')!

      const result = await organizationApplicationService.listMembers(
        organizationId,
        user.id,
        queryOptions
      )

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch members'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/requests',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateQuery(requestFilterQuerySchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const queryOptions = c.req.valid('query')
      const user = c.get('user')!

      const requests = await requestsApplicationService.getOrganizationRequests(
        organizationId,
        user.id,
        queryOptions
      )

      const response: ApiResponse<typeof requests> = {
        success: true,
        data: requests,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization requests'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/user/role',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!

      const roleResult = await organizationApplicationService.getUserRole(organizationId, user.id)

      const response: ApiResponse<{ role: string | null }> = {
        success: true,
        data: { role: roleResult || null },
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch user role'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/setup-status',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!
      const setupStatus = await organizationApplicationService.getSetupStatus(
        organizationId,
        user.id
      )

      const response: ApiResponse<typeof setupStatus> = {
        success: true,
        data: setupStatus,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch setup status'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/invitations',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateQuery(invitationFilterQuerySchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const queryOptions = c.req.valid('query')
      const user = c.get('user')!

      const invitations = await invitationApplicationService.getInvitations(
        organizationId,
        user.id,
        queryOptions
      )

      const response: ApiResponse<typeof invitations> = {
        success: true,
        data: invitations,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization invitations'
      )
      return c.json(response, 500)
    }
  }
)

organization.post(
  '/:organizationId/invitations',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(createInvitationSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { email, role } = c.req.valid('json')
      const user = c.get('user')!

      const result = await invitationApplicationService.createInvitation(
        email,
        role,
        organizationId,
        user.id
      )

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'member-invited',
        description: `invited ${email} as ${role}`,
        metadata: { email, role },
      })

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }
      return c.json(response, 201)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to create invitation'
      )
      return c.json(response, 500)
    }
  }
)

organization.get('/invitation/:invitationId', async (c) => {
  try {
    const invitationId = c.req.param('invitationId')

    const invitationDetails = await invitationApplicationService.getInvitationDetails(invitationId)

    if (!invitationDetails) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.NOT_FOUND,
        'Invitation not found'
      )
      return c.json(response, 404)
    }

    const response: ApiResponse<typeof invitationDetails> = {
      success: true,
      data: invitationDetails,
    }
    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to get invitation details'
    )
    return c.json(response, 500)
  }
})

organization.post('/invitation/:invitationId/resend', requireAuthMiddleware, async (c) => {
  try {
    const invitationId = c.req.param('invitationId')
    const user = c.get('user')!

    const result = await invitationApplicationService.resendInvitation(invitationId!, user.id)

    const details = await invitationApplicationService.getInvitationDetails(invitationId!)
    if (details?.organizationId) {
      void activityApplicationService.logEvent({
        organizationId: details.organizationId,
        actorId: user.id,
        eventType: 'invitation-resent',
        description: `resent invitation to ${details.email}`,
        metadata: { invitationId, email: details.email },
      })
    }

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: result.message,
    }
    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to resend invitation'
    )
    return c.json(response, 500)
  }
})

// Archive invitations
organization.post(
  '/:organizationId/invitations/archive',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(archiveInvitationsSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { invitationIds } = c.req.valid('json')
      const user = c.get('user')!

      const result = await invitationApplicationService.archiveInvitations(
        invitationIds,
        user.id,
        organizationId
      )

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to archive invitations'
      )
      return c.json(response, 500)
    }
  }
)

// Unarchive invitations
organization.post(
  '/:organizationId/invitations/unarchive',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(archiveInvitationsSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { invitationIds } = c.req.valid('json')
      const user = c.get('user')!

      const result = await invitationApplicationService.unarchiveInvitations(
        invitationIds,
        user.id,
        organizationId
      )

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to unarchive invitations'
      )
      return c.json(response, 500)
    }
  }
)

// Update invitation role
organization.patch(
  '/invitation/:invitationId/role',
  requireAuthMiddleware,
  validateParam(invitationIdParamSchema),
  validateJson(updateInvitationRoleSchema),
  async (c) => {
    try {
      const { invitationId } = c.req.valid('param')
      const { role } = c.req.valid('json')
      const user = c.get('user')!

      const result = await invitationApplicationService.updateInvitationRole(
        invitationId,
        user.id,
        role
      )

      const details = await invitationApplicationService.getInvitationDetails(invitationId)
      if (details?.organizationId) {
        void activityApplicationService.logEvent({
          organizationId: details.organizationId,
          actorId: user.id,
          eventType: 'invitation-role-updated',
          description: `updated invitation role to ${role}`,
          metadata: { invitationId, role },
        })
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update invitation role'
      )
      return c.json(response, 500)
    }
  }
)

// Cancel single invitation
organization.post(
  '/invitation/:invitationId/cancel',
  requireAuthMiddleware,
  validateParam(invitationIdParamSchema),
  async (c) => {
    try {
      const { invitationId } = c.req.valid('param')
      const user = c.get('user')!

      const details = await invitationApplicationService.getInvitationDetails(invitationId)

      const result = await invitationApplicationService.cancelInvitation(invitationId, user.id)

      if (details?.organizationId) {
        void activityApplicationService.logEvent({
          organizationId: details.organizationId,
          actorId: user.id,
          eventType: 'invitation-cancelled',
          description: `cancelled invitation to ${details.email}`,
          metadata: { invitationId, email: details.email },
        })
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to cancel invitation'
      )
      return c.json(response, 500)
    }
  }
)

// Cancel multiple invitations (bulk)
organization.post(
  '/:organizationId/invitations/cancel',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(archiveInvitationsSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { invitationIds } = c.req.valid('json')
      const user = c.get('user')!

      const result = await invitationApplicationService.cancelInvitations(
        invitationIds,
        user.id,
        organizationId
      )

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'invitations-cancelled-bulk',
        description: `cancelled ${invitationIds.length} invitation(s)`,
        metadata: { count: invitationIds.length },
      })

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to cancel invitations'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/categories',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { categoriesApplicationService } = await import(
        '../../categories/categories.application'
      )
      const categories = await categoriesApplicationService.getByOrganization(organizationId)

      const response: ApiResponse<typeof categories> = {
        success: true,
        data: categories,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization categories'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/categories/all',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { categoriesApplicationService } = await import(
        '../../categories/categories.application'
      )
      const categories = await categoriesApplicationService.getWithSelectionStatus(organizationId)

      const response: ApiResponse<typeof categories> = {
        success: true,
        data: categories,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch categories with selection status'
      )
      return c.json(response, 500)
    }
  }
)

organization.patch(
  '/:organizationId/categories',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const body = await c.req.json()

      const user = c.get('user')!
      const { categoriesApplicationService } = await import(
        '../../categories/categories.application'
      )
      const result = await categoriesApplicationService.updateOrganizationCategories(
        organizationId,
        body
      )

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'organization-categories-updated',
        description: 'updated organization categories',
      })

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Organization categories updated successfully',
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update organization categories'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/services',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { servicesApplicationService } = await import('../../services/services.application')
      const services = await servicesApplicationService.getByOrganization(organizationId)

      const response: ApiResponse<typeof services> = {
        success: true,
        data: services,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization services'
      )
      return c.json(response, 500)
    }
  }
)

organization.get(
  '/:organizationId/services/all',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { servicesApplicationService } = await import('../../services/services.application')
      const services = await servicesApplicationService.getWithSelectionStatus(organizationId)

      const response: ApiResponse<typeof services> = {
        success: true,
        data: services,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch services with selection status'
      )
      return c.json(response, 500)
    }
  }
)

organization.patch(
  '/:organizationId/services',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const body = await c.req.json()

      const user = c.get('user')!
      const { servicesApplicationService } = await import('../../services/services.application')
      const result = await servicesApplicationService.updateOrganizationServices(
        organizationId,
        body
      )

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'organization-services-updated',
        description: 'updated organization services',
      })

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Organization services updated successfully',
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update organization services'
      )
      return c.json(response, 500)
    }
  }
)

organization.get('/:organizationId/info', validateParam(organizationIdParamSchema), async (c) => {
  try {
    const { organizationId } = c.req.valid('param')
    const organizationData = await organizationApplicationService.getInfo(organizationId)

    if (!organizationData) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.NOT_FOUND,
        'Organization not found'
      )
      return c.json(response, 404)
    }

    const response: ApiResponse<typeof organizationData> = {
      success: true,
      data: organizationData,
    }
    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to fetch organization info'
    )
    return c.json(response, 500)
  }
})

organization.patch(
  '/:organizationId',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(updateOrganizationSettingsSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const settings = c.req.valid('json')
      const user = c.get('user')!
      const previousOrganization =
        settings.slug !== undefined
          ? await organizationApplicationService.getInfo(organizationId)
          : null

      await organizationApplicationService.updateSettings(organizationId, user.id, settings)

      if (shouldNotifyOrganizationRealtimeUpdate(settings)) {
        void organizationApplicationService.notifyRealtimeUpdate(
          organizationId,
          previousOrganization?.slug ?? null
        )
      }

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'organization-updated',
        description: 'updated organization settings',
      })

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Organization settings updated successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update organization settings'
      if (
        message === 'Insufficient permissions. Admin or Owner role required' ||
        message === 'User is not a member of this organization'
      ) {
        const response: ApiResponse = createApiErrorResponse(ErrorCode.FORBIDDEN, message)
        return c.json(response, 403)
      }

      if (error instanceof OrganizationSlugError) {
        const response: ApiResponse = createApiErrorResponse(
          error.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST,
          error.message,
          { errorCode: error.errorCode }
        )
        return c.json(response, error.status)
      }

      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update organization settings'
      )
      return c.json(response, 500)
    }
  }
)

organization.get('/brand-colors', async (c) => {
  const response: ApiResponse<typeof BRAND_COLORS> = {
    success: true,
    data: BRAND_COLORS,
  }
  return c.json(response, 200)
})

organization.patch(
  '/:organizationId/tax-id',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!
      const body = await c.req.json()

      await organizationApplicationService.updateTaxId(organizationId, user.id, {
        taxIdType: body.taxIdType || null,
        taxIdNumber: body.taxIdNumber || null,
      })

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'organization-tax-id-updated',
        description: 'updated tax ID',
      })

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Tax ID updated successfully',
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update tax ID'
      )
      return c.json(response, 500)
    }
  }
)

organization.patch(
  '/:organizationId/logo',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!
      const body = await c.req.parseBody()
      const file = body.logo as File

      if (!file) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.BAD_REQUEST,
          'Logo file is required'
        )
        return c.json(response, 400)
      }

      const { validateFile } = await import('../../../infrastructure/storage/file-upload.utils')
      const validation = validateFile(file, 'AVATARS')
      if (!validation.valid) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.BAD_REQUEST,
          validation.error || 'File validation failed'
        )
        return c.json(response, 400)
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await organizationApplicationService.updateLogo(
        organizationId,
        user.id,
        buffer,
        file.name,
        file.type
      )
      void organizationApplicationService.notifyRealtimeUpdate(organizationId)

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Organization logo updated successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('type not allowed') ||
          error.message.includes('Inappropriate content')
        ) {
          const response: ApiResponse = createApiErrorResponse(ErrorCode.BAD_REQUEST, error.message)
          return c.json(response, 400)
        }
      }
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update organization logo'
      )
      return c.json(response, 500)
    }
  }
)

organization.delete(
  '/:organizationId/logo',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!

      await organizationApplicationService.removeLogo(organizationId, user.id)
      void organizationApplicationService.notifyRealtimeUpdate(organizationId)

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Organization logo removed successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove organization logo'
      const status = message.includes('No logo')
        ? 400
        : message.includes('Insufficient permissions')
          ? 403
          : 500
      const code =
        status === 400 ? 'BAD_REQUEST' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR'
      const response: ApiResponse = createApiErrorResponse(
        code,
        status === 500 ? 'Failed to remove organization logo' : message
      )
      return c.json(response, status)
    }
  }
)

organization.post(
  '/:organizationId/showcase/invitations',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(sendShowcaseEmailsSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { emails } = c.req.valid('json')
      const user = c.get('user')!

      const organizationData = await organizationApplicationService.getInfo(organizationId)
      if (!organizationData) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.NOT_FOUND,
          'Organization not found'
        )
        return c.json(response, 404)
      }

      const memberRole = await organizationApplicationService.getUserRole(organizationId, user.id)
      if (!memberRole) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.FORBIDDEN,
          'You do not have permission to send showcase invitations'
        )
        return c.json(response, 403)
      }

      const companyPageUrl = `${env.FRONTEND_URL}/org/${organizationData.slug}`

      const { EmailService } = await import('../../../../emails/services/email.service')
      const { EmailTemplate } = await import('../../../../emails/types')

      await EmailService.sendTemplatedEmail(
        EmailTemplate.SHOWCASE_INVITATION,
        {
          inviterName: user.name || 'Team member',
          organizationName: organizationData.name,
          showcaseLink: companyPageUrl,
        },
        {
          to: emails,
          subject: `Discover ${organizationData.name}'s capabilities`,
          organizationId,
        }
      )

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'showcase-invitations-sent',
        description: `sent ${emails.length} showcase invitation(s)`,
        metadata: { count: emails.length },
      })

      const response: ApiResponse<{ sent: number; failed: number }> = {
        success: true,
        data: { sent: emails.length, failed: 0 },
        message: `Successfully sent ${emails.length} email${emails.length > 1 ? 's' : ''}`,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to send showcase invitations'
      )
      return c.json(response, 500)
    }
  }
)

organization.patch(
  '/:organizationId/email-intake',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  validateJson(updateEmailIntakeSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const { enabled } = c.req.valid('json')
      const user = c.get('user')!

      const result = await organizationApplicationService.updateEmailIntake(
        organizationId,
        user.id,
        enabled
      )

      void activityApplicationService.logEvent({
        organizationId,
        actorId: user.id,
        eventType: 'email-intake-updated',
        description: enabled ? 'enabled email intake' : 'disabled email intake',
        metadata: { enabled },
      })

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: enabled ? 'Email intake enabled' : 'Email intake disabled',
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update email intake settings'
      )
      return c.json(response, 500)
    }
  }
)

organization.patch(
  '/:organizationId/members/:memberId/role',
  requireAuthMiddleware,
  validateParam(memberIdParamSchema),
  validateJson(updateMemberRoleSchema),
  async (c) => {
    try {
      const { organizationId, memberId } = c.req.valid('param')
      const { role } = c.req.valid('json')
      const user = c.get('user')!

      const result = await organizationApplicationService.updateMemberRole(
        organizationId,
        user.id,
        memberId,
        role
      )

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Member role updated',
      }
      return c.json(response, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update member role'
      const status =
        message === 'Member not found'
          ? 404
          : message === 'Insufficient permissions. Admin or Owner role required'
            ? 403
            : message === 'Owner roles cannot be changed' ||
                message === 'You cannot change your own role'
              ? 400
              : 500
      const code =
        status === 404
          ? 'NOT_FOUND'
          : status === 403
            ? 'FORBIDDEN'
            : status === 400
              ? 'BAD_REQUEST'
              : 'INTERNAL_SERVER_ERROR'
      const response: ApiResponse = createApiErrorResponse(
        code,
        status === 500 ? 'Failed to update member role' : message
      )
      return c.json(response, status)
    }
  }
)

organization.delete(
  '/:organizationId/members/me',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!

      await organizationApplicationService.leaveOrganization(organizationId, user.id)

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'You left the organization',
      }
      return c.json(response, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave organization'
      const status =
        message === 'Membership not found'
          ? 404
          : message === 'Owners must transfer ownership before leaving'
            ? 403
            : 500
      const code =
        status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR'
      const response: ApiResponse = createApiErrorResponse(
        code,
        status === 500 ? 'Failed to leave organization' : message
      )
      return c.json(response, status)
    }
  }
)

organization.delete(
  '/:organizationId/members/:memberId',
  requireAuthMiddleware,
  validateParam(memberIdParamSchema),
  async (c) => {
    try {
      const { organizationId, memberId } = c.req.valid('param')
      const user = c.get('user')!

      await organizationApplicationService.removeMember(organizationId, user.id, memberId)

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Member removed',
      }
      return c.json(response, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove member'
      const status =
        message === 'Member not found'
          ? 404
          : message === 'Insufficient permissions. Admin or Owner role required'
            ? 403
            : message === 'Owners cannot be removed' ||
                message === 'You cannot remove yourself. Use leave organization instead.'
              ? 400
              : 500
      const code =
        status === 404
          ? 'NOT_FOUND'
          : status === 403
            ? 'FORBIDDEN'
            : status === 400
              ? 'BAD_REQUEST'
              : 'INTERNAL_SERVER_ERROR'
      const response: ApiResponse = createApiErrorResponse(
        code,
        status === 500 ? 'Failed to remove member' : message
      )
      return c.json(response, status)
    }
  }
)

export default organization
