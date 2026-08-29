import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { createOnboardingRoutes } from '../presentation/onboarding.routes'

const onboardingService = {
  getOnboardingStatus: mock(async () => ({
    accountCreated: true,
    organizationCreated: true,
    subscriptionActive: true,
    currentStep: 'completed' as const,
  })),
  getOrganizationByUserId: mock(async () => ({ id: 'org-123', name: 'Ortelius' })),
  getActiveSubscriptionForOrganization: mock(async () => ({ id: 'sub-123' })),
  getAvailablePlans: mock(async () => [{ name: 'starter' }]),
  hasUserCompletedOnboarding: mock(async () => true),
  checkOrganizationNameAvailable: mock(async () => ({ available: true, slug: 'ortelius' })),
  checkOrganizationSlugAvailable: mock(async () => ({ available: true, slug: 'ortelius' })),
}

function createApp(authenticated = true) {
  const app = new Hono<{ Variables: CommonVariables }>()
  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('user', { id: 'user-123', email: 'ada@example.com' } as never)
      await next()
    })
  }
  app.route('/onboarding', createOnboardingRoutes(onboardingService))
  return app
}

describe('Onboarding routes', () => {
  beforeEach(() => {
    Object.values(onboardingService).forEach((fn) => fn.mockClear())
  })

  it('returns onboarding status with organization and subscription', async () => {
    const response = await createApp().request('/onboarding/status')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status.currentStep).toBe('completed')
    expect(json.organization).toEqual({ id: 'org-123', name: 'Ortelius' })
    expect(json.subscription).toEqual({ id: 'sub-123' })
  })

  it('returns available plans without requiring auth', async () => {
    const response = await createApp(false).request('/onboarding/plans')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ plans: [{ name: 'starter' }] })
  })

  it('checks completion, organization name availability, and organization slug availability', async () => {
    const completeResponse = await createApp().request('/onboarding/complete-check', {
      method: 'POST',
    })
    const completeJson = await completeResponse.json()

    const nameResponse = await createApp().request(
      '/onboarding/check-organization-name?name=Ortelius'
    )
    const nameJson = await nameResponse.json()
    const slugResponse = await createApp().request(
      '/onboarding/check-organization-slug?slug=ortelius'
    )
    const slugJson = await slugResponse.json()

    expect(completeResponse.status).toBe(200)
    expect(completeJson).toEqual({ completed: true })
    expect(nameResponse.status).toBe(200)
    expect(nameJson).toEqual({ available: true, slug: 'ortelius' })
    expect(slugResponse.status).toBe(200)
    expect(slugJson).toEqual({ available: true, slug: 'ortelius' })
  })

  it('keeps auth errors and missing name validation', async () => {
    const unauthorized = await createApp(false).request('/onboarding/status')
    const missingName = await createApp().request('/onboarding/check-organization-name')
    const missingSlug = await createApp().request('/onboarding/check-organization-slug')

    expect(unauthorized.status).toBe(401)
    expect(await unauthorized.json()).toEqual({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    })
    expect(missingName.status).toBe(400)
    expect(await missingName.json()).toEqual({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Organization name is required',
    })
    expect(missingSlug.status).toBe(400)
    expect(await missingSlug.json()).toEqual({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Organization slug is required',
    })
  })
})
