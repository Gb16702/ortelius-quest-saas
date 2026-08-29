import { Hono } from 'hono'
import {
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import {
  type OnboardingApplicationService,
  onboardingApplicationService,
} from '../onboarding.application'

type OnboardingRouteService = Pick<
  OnboardingApplicationService,
  | 'getOnboardingStatus'
  | 'getOrganizationByUserId'
  | 'getActiveSubscriptionForOrganization'
  | 'getAvailablePlans'
  | 'hasUserCompletedOnboarding'
  | 'checkOrganizationNameAvailable'
  | 'checkOrganizationSlugAvailable'
>

export function createOnboardingRoutes(
  service: OnboardingRouteService = onboardingApplicationService
) {
  const onboardingRoutes = new Hono<{ Variables: CommonVariables }>()

  onboardingRoutes.get('/status', async (c) => {
    const user = c.get('user') as { id: string; email: string } | undefined

    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    }

    const status = await service.getOnboardingStatus(user.id)

    let organization = null
    if (status.organizationCreated) {
      organization = await service.getOrganizationByUserId(user.id)
    }

    let subscription = null
    if (organization && status.subscriptionActive) {
      subscription = await service.getActiveSubscriptionForOrganization(organization.id)
    }

    return c.json({
      status,
      organization,
      subscription,
    })
  })

  // Public route - no auth required (for marketing/pricing page)
  onboardingRoutes.get('/plans', async (c) => {
    const plans = await service.getAvailablePlans()
    return c.json({ plans })
  })

  onboardingRoutes.post('/complete-check', async (c) => {
    const user = c.get('user') as { id: string; email: string } | undefined

    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    }

    const isComplete = await service.hasUserCompletedOnboarding(user.id)

    return c.json({ completed: isComplete })
  })

  onboardingRoutes.get('/check-organization-name', async (c) => {
    const user = c.get('user') as { id: string; email: string } | undefined

    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    }

    const name = c.req.query('name')

    if (!name) {
      return c.json(
        createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Organization name is required'),
        400
      )
    }

    const result = await service.checkOrganizationNameAvailable(name)

    return c.json(result)
  })

  onboardingRoutes.get('/check-organization-slug', async (c) => {
    const user = c.get('user') as { id: string; email: string } | undefined

    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    }

    const slug = c.req.query('slug')

    if (!slug) {
      return c.json(
        createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Organization slug is required'),
        400
      )
    }

    const result = await service.checkOrganizationSlugAvailable(slug)

    return c.json(result)
  })

  return onboardingRoutes
}

export default createOnboardingRoutes()
