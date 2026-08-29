import { Hono } from 'hono'
import { env } from '../../../infrastructure/config/environment'
import {
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson } from '../../../infrastructure/validation/validation.utils'
import { CheckoutSlugError } from '../application/checkout-use-cases'
import { checkoutApplicationService } from '../checkout.application'
import {
  completeCheckoutSchema,
  confirmSubscriptionSchema,
  createSubscriptionSchema,
  startTrialSchema,
  validateInviteEmailSchema,
} from './checkout.schemas'

const checkoutRoutes = new Hono<{ Variables: CommonVariables }>()

checkoutRoutes.post('/create-subscription', validateJson(createSubscriptionSchema), async (c) => {
  try {
    const {
      email,
      fullName,
      organizationName,
      organizationSlug,
      plan,
      priceId,
      annual,
      initialSeats,
    } = c.req.valid('json')

    const result = await checkoutApplicationService.createSubscription({
      email,
      fullName,
      organizationName,
      organizationSlug,
      plan,
      priceId,
      annual,
      initialSeats,
    })

    return c.json(result)
  } catch (error) {
    if (error instanceof CheckoutSlugError) {
      return c.json(
        createApiErrorResponse(
          error.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST,
          error.message,
          { errorCode: error.errorCode }
        ),
        error.status
      )
    }

    console.error('Error creating subscription:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create subscription'),
      500
    )
  }
})

checkoutRoutes.post('/confirm-subscription', validateJson(confirmSubscriptionSchema), async (c) => {
  try {
    const { subscriptionId, paymentIntentId } = c.req.valid('json')

    const result = await checkoutApplicationService.confirmSubscription(
      subscriptionId,
      paymentIntentId
    )

    return c.json(result)
  } catch (error) {
    console.error('Error confirming subscription:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to confirm subscription'),
      500
    )
  }
})

checkoutRoutes.post(
  '/validate-invite-email',
  validateJson(validateInviteEmailSchema),
  async (c) => {
    try {
      const user = c.get('user') as { id: string; email: string; name?: string } | undefined

      if (!user?.email) {
        return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
      }

      const { email } = c.req.valid('json')

      const result = await checkoutApplicationService.validateInviteEmail({
        email,
        currentUserEmail: user.email,
      })

      return c.json(result)
    } catch (error) {
      console.error('Error validating invite email:', error)
      return c.json(
        createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to validate email'),
        500
      )
    }
  }
)

checkoutRoutes.post('/start-trial', validateJson(startTrialSchema), async (c) => {
  try {
    const user = c.get('user') as { id: string; email: string; name?: string } | undefined

    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    }

    const { organizationName, organizationSlug, plan } = c.req.valid('json')

    const result = await checkoutApplicationService.startFreeTrial({
      organizationName,
      organizationSlug,
      plan,
      userId: user.id,
      email: user.email,
      fullName: user.name || user.email,
    })

    const redirectUrl = `${env.FRONTEND_URL}/org/${result.slug}/dashboard/organization?onboarding=true`

    return c.json({
      success: true,
      checkoutId: result.checkoutId,
      organizationId: result.organizationId,
      slug: result.slug,
      redirectUrl,
    })
  } catch (error) {
    if (error instanceof CheckoutSlugError) {
      return c.json(
        createApiErrorResponse(
          error.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST,
          error.message,
          { errorCode: error.errorCode }
        ),
        error.status
      )
    }

    console.error('Error starting trial:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to start trial'),
      500
    )
  }
})

checkoutRoutes.post('/complete', validateJson(completeCheckoutSchema), async (c) => {
  try {
    const user = c.get('user') as { id: string; email: string; name?: string } | undefined

    if (!user) {
      return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
    }

    const body = c.req.valid('json')

    const result = await checkoutApplicationService.completeCheckout({
      checkoutId: 'checkoutId' in body ? body.checkoutId : undefined,
      stripeSubscriptionId: 'stripeSubscriptionId' in body ? body.stripeSubscriptionId : undefined,
      organizationName: body.organizationName,
      organizationSlug: body.organizationSlug,
      userId: user.id,
    })

    const redirectUrl = `${env.FRONTEND_URL}/org/${result.slug}/dashboard/organization?onboarding=true`

    return c.json({
      success: true,
      organizationId: result.organizationId,
      slug: result.slug,
      redirectUrl,
    })
  } catch (error) {
    if (error instanceof CheckoutSlugError) {
      return c.json(
        createApiErrorResponse(
          error.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST,
          error.message,
          { errorCode: error.errorCode }
        ),
        error.status
      )
    }

    console.error('Error completing checkout:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to complete checkout'),
      500
    )
  }
})

export default checkoutRoutes
