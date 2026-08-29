import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import {
  InvoiceEmailError,
  PaymentMethodError,
  PlanChangeError,
  SubscribeError,
  SubscriptionBillingAccountError,
  type SubscriptionBillingMembership,
} from '../domain'

const billingMembership: SubscriptionBillingMembership = {
  organizationId: 'org-123',
  organizationName: 'Quest Co',
  role: 'owner',
}

const mockSubscriptionApplicationService = {
  requireBillingManager: mock(async () => billingMembership),
  updateInvoiceEmail: mock(async () => ({ success: true as const })),
  previewChange: mock(async () => ({
    direction: 'downgrade' as const,
    newPlan: 'Starter',
    newPlanKey: 'starter' as const,
    newPrice: 1000,
    billingInterval: 'monthly' as const,
    currentPlan: 'Professional',
    currentPlanKey: 'professional' as const,
    nextBillingDate: '2026-06-01T00:00:00.000Z',
    currency: 'eur',
  })),
  cancelPendingChange: mock(async () => ({ success: true as const })),
  createSetupIntent: mock(async () => ({ clientSecret: 'seti_secret' })),
  confirmSubscribe: mock(async () => ({
    success: true as const,
    plan: 'starter' as const,
    subscriptionId: 'sub-123',
  })),
}

mock.module('../subscription.application', () => ({
  subscriptionApplicationService: mockSubscriptionApplicationService,
}))

const subscriptionRoutes = (await import('../presentation/subscription.routes')).default

const serviceMocks = [
  mockSubscriptionApplicationService.requireBillingManager,
  mockSubscriptionApplicationService.updateInvoiceEmail,
  mockSubscriptionApplicationService.previewChange,
  mockSubscriptionApplicationService.cancelPendingChange,
  mockSubscriptionApplicationService.createSetupIntent,
  mockSubscriptionApplicationService.confirmSubscribe,
]

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.use('*', async (c, next) => {
    c.set('user', { id: 'user-123', email: 'test@example.com' } as never)
    await next()
  })
  app.route('/subscription', subscriptionRoutes)
  return app
}

describe('Subscription routes error contract', () => {
  beforeEach(() => {
    serviceMocks.forEach((fn) => fn.mockClear())
    mockSubscriptionApplicationService.requireBillingManager.mockResolvedValue(billingMembership)
    mockSubscriptionApplicationService.updateInvoiceEmail.mockResolvedValue({ success: true })
    mockSubscriptionApplicationService.previewChange.mockResolvedValue({
      direction: 'downgrade',
      newPlan: 'Starter',
      newPlanKey: 'starter',
      newPrice: 1000,
      billingInterval: 'monthly',
      currentPlan: 'Professional',
      currentPlanKey: 'professional',
      nextBillingDate: '2026-06-01T00:00:00.000Z',
      currency: 'eur',
    })
    mockSubscriptionApplicationService.cancelPendingChange.mockResolvedValue({ success: true })
    mockSubscriptionApplicationService.createSetupIntent.mockResolvedValue({
      clientSecret: 'seti_secret',
    })
    mockSubscriptionApplicationService.confirmSubscribe.mockResolvedValue({
      success: true,
      plan: 'starter',
      subscriptionId: 'sub-123',
    })
  })

  it('uses a common validation code and field reason for invalid invoice email input', async () => {
    const response = await createApp().request('/subscription/invoice-email', {
      method: 'PUT',
      body: JSON.stringify({ email: '' }),
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'A valid email address is required.',
      details: { field: 'email', reason: 'INVALID_EMAIL' },
    })
    expect(mockSubscriptionApplicationService.updateInvoiceEmail).not.toHaveBeenCalled()
  })

  it('moves domain validation reasons into details', async () => {
    mockSubscriptionApplicationService.updateInvoiceEmail.mockRejectedValueOnce(
      new InvoiceEmailError('INVALID_EMAIL', 'A valid email address is required.')
    )

    const response = await createApp().request('/subscription/invoice-email', {
      method: 'PUT',
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'A valid email address is required.',
      details: { field: 'email', reason: 'INVALID_EMAIL' },
    })
  })

  it('keeps forbidden responses on a common top-level code', async () => {
    mockSubscriptionApplicationService.requireBillingManager.mockRejectedValueOnce(
      new SubscriptionBillingAccountError('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions')
    )

    const response = await createApp().request('/subscription/preview-change', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_starter_monthly' }),
    })
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
      details: { reason: 'INSUFFICIENT_PERMISSIONS' },
    })
  })

  it('keeps not found responses on a common top-level code', async () => {
    mockSubscriptionApplicationService.previewChange.mockRejectedValueOnce(
      new PlanChangeError('NO_ACTIVE_SUBSCRIPTION', 'No active subscription found')
    )

    const response = await createApp().request('/subscription/preview-change', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_starter_monthly' }),
    })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'No active subscription found',
      details: { reason: 'NO_ACTIVE_SUBSCRIPTION' },
    })
  })

  it('keeps conflict responses on a common top-level code', async () => {
    mockSubscriptionApplicationService.cancelPendingChange.mockRejectedValueOnce(
      new PlanChangeError('NO_PENDING_CHANGE', 'No pending change to cancel')
    )

    const response = await createApp().request('/subscription/cancel-pending-change', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(409)
    expect(json).toEqual({
      success: false,
      code: 'CONFLICT',
      message: 'No pending change to cancel',
      details: { reason: 'NO_PENDING_CHANGE' },
    })
  })

  it('maps Stripe outages to an upstream common top-level code', async () => {
    mockSubscriptionApplicationService.createSetupIntent.mockRejectedValueOnce(
      new PaymentMethodError('STRIPE_UNAVAILABLE', 'Stripe is unavailable')
    )

    const response = await createApp().request('/subscription/setup-intent', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json).toEqual({
      success: false,
      code: 'UPSTREAM_UNAVAILABLE',
      message: 'Stripe is unavailable',
      details: { reason: 'STRIPE_UNAVAILABLE' },
    })
  })

  it('maps inactive subscription confirmation to a common payment-required code', async () => {
    mockSubscriptionApplicationService.confirmSubscribe.mockRejectedValueOnce(
      new SubscribeError(
        'SUBSCRIPTION_NOT_ACTIVE',
        "Your subscription isn't active yet. Please complete payment first."
      )
    )

    const response = await createApp().request('/subscription/confirm-subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId: 'sub-123' }),
    })
    const json = await response.json()

    expect(response.status).toBe(402)
    expect(json).toEqual({
      success: false,
      code: 'PAYMENT_REQUIRED',
      message: "Your subscription isn't active yet. Please complete payment first.",
      details: { reason: 'SUBSCRIPTION_NOT_ACTIVE' },
    })
  })

  it('does not expose unexpected internal errors', async () => {
    mockSubscriptionApplicationService.previewChange.mockRejectedValueOnce(
      new Error('database password=secret')
    )
    const errorLog = mock(() => undefined)
    const originalError = console.error
    console.error = errorLog

    try {
      const response = await createApp().request('/subscription/preview-change', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_starter_monthly' }),
      })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json).toEqual({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong while loading your plan change.',
      })
      expect(errorLog).toHaveBeenCalled()
    } finally {
      console.error = originalError
    }
  })
})
