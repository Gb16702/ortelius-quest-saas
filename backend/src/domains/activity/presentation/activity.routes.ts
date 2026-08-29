import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateQuery } from '../../../infrastructure/validation/validation.utils'
import { organizationApplicationService } from '../../organization/organization.application'
import { activityApplicationService } from '../activity.application'
import type { ActivityPage, ActivityScore } from '../application/activity-models'
import { getActivityScoreTargetPoints } from '../domain'
import { activityFiltersSchema, activityScoreQuerySchema } from './activity.schemas'

type ActivityRouteService = Pick<
  typeof activityApplicationService,
  'getEvents' | 'getEventTypes' | 'getScore'
>
type OrganizationRouteService = Pick<typeof organizationApplicationService, 'listUserOrganizations'>
type ActivityAuthMiddleware = MiddlewareHandler<{ Variables: CommonVariables }>

function resolveOrganizationId(
  userOrganizations: ReadonlyArray<{ id: string }>,
  requestedOrganizationId?: string
): { organizationId: string | null; forbidden: boolean } {
  if (userOrganizations.length === 0) {
    return { organizationId: null, forbidden: false }
  }

  if (!requestedOrganizationId) {
    return { organizationId: userOrganizations[0].id, forbidden: false }
  }

  if (userOrganizations.some((organization) => organization.id === requestedOrganizationId)) {
    return { organizationId: requestedOrganizationId, forbidden: false }
  }

  return { organizationId: null, forbidden: true }
}

export function createActivityRoutes(
  activityService: ActivityRouteService = activityApplicationService,
  organizationService: OrganizationRouteService = organizationApplicationService,
  authMiddleware: ActivityAuthMiddleware = requireAuthMiddleware
) {
  const activity = new Hono<{ Variables: CommonVariables }>()

  activity.get('/', authMiddleware, validateQuery(activityFiltersSchema), async (c) => {
    try {
      const user = c.get('user')!
      const filters = c.req.valid('query')

      const userOrganizations = await organizationService.listUserOrganizations(user.id)

      if (userOrganizations.length === 0) {
        const response: ApiResponse<ActivityPage> = {
          success: true,
          data: { events: [], nextCursor: null },
        }
        return c.json(response)
      }

      const resolvedOrganization = resolveOrganizationId(userOrganizations, filters.organizationId)
      if (resolvedOrganization.forbidden) {
        return c.json(
          createApiErrorResponse(ErrorCode.FORBIDDEN, 'Insufficient organization permissions'),
          403
        )
      }

      const organizationId = resolvedOrganization.organizationId!
      const result = await activityService.getEvents(organizationId, {
        actorId: filters.actorId,
        eventTypes: filters.eventTypes,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        cursor: filters.cursor,
        limit: filters.limit,
      })

      const response: ApiResponse<ActivityPage> = {
        success: true,
        data: result,
      }
      return c.json(response)
    } catch (error) {
      console.error('Failed to fetch activity events:', error)
      return c.json(
        createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch activity events'),
        500
      )
    }
  })

  activity.get('/score', authMiddleware, validateQuery(activityScoreQuerySchema), async (c) => {
    try {
      const user = c.get('user')!
      const query = c.req.valid('query')
      const userOrganizations = await organizationService.listUserOrganizations(user.id)
      const resolvedOrganization = resolveOrganizationId(userOrganizations, query.organizationId)

      if (resolvedOrganization.forbidden) {
        return c.json(
          createApiErrorResponse(ErrorCode.FORBIDDEN, 'Insufficient organization permissions'),
          403
        )
      }

      if (!resolvedOrganization.organizationId) {
        const response: ApiResponse<ActivityScore> = {
          success: true,
          data: {
            score: 0,
            previousScore: 0,
            totalPoints: 0,
            previousTotalPoints: 0,
            targetPoints: getActivityScoreTargetPoints(query.days),
            periodDays: query.days,
            breakdown: [],
          },
        }
        return c.json(response)
      }

      const result = await activityService.getScore({
        organizationId: resolvedOrganization.organizationId,
        actorId: query.actorId,
        days: query.days,
      })

      const response: ApiResponse<ActivityScore> = {
        success: true,
        data: result,
      }
      return c.json(response)
    } catch (error) {
      console.error('Failed to fetch activity score:', error)
      return c.json(
        createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch activity score'),
        500
      )
    }
  })

  activity.get('/event-types', authMiddleware, async (c) => {
    try {
      const eventTypes = await activityService.getEventTypes()

      return c.json({ success: true, data: eventTypes })
    } catch (error) {
      console.error('Failed to fetch event types:', error)
      return c.json(
        createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch event types'),
        500
      )
    }
  })

  return activity
}

export default createActivityRoutes()
