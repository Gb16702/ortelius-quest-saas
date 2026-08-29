import { type Context, Hono } from 'hono'
import {
  type ApiErrorResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import {
  BillingAddressError,
  CANCEL_REASONS,
  CancelSubscriptionError,
  InvoiceEmailError,
  InvoiceLanguageError,
  PaymentMethodError,
  PlanChangeError,
  SubscribeError,
  SubscriptionBillingAccountError,
  type SubscriptionBillingMembership,
} from '../domain'
import { subscriptionApplicationService } from '../subscription.application'

const subscriptionRoutes = new Hono<{ Variables: CommonVariables }>()

type SubscriptionRouteContext = Context<{ Variables: CommonVariables }>
type SubscriptionDomainError =
  | BillingAddressError
  | CancelSubscriptionError
  | InvoiceEmailError
  | InvoiceLanguageError
  | PaymentMethodError
  | PlanChangeError
  | SubscribeError
  | SubscriptionBillingAccountError
type SubscriptionDomainErrorCode = SubscriptionDomainError['code']
type SubscriptionErrorStatus = 400 | 402 | 403 | 404 | 409 | 503
type SubscriptionDomainErrorMeta = {
  status: SubscriptionErrorStatus
  code: ErrorCode
  field?: string
}

const subscriptionDomainErrorMeta: Record<
  SubscriptionDomainErrorCode,
  SubscriptionDomainErrorMeta
> = {
  NO_ORGANIZATION: { status: 404, code: ErrorCode.NOT_FOUND },
  INSUFFICIENT_PERMISSIONS: { status: 403, code: ErrorCode.FORBIDDEN },
  NO_ACTIVE_SUBSCRIPTION: { status: 404, code: ErrorCode.NOT_FOUND },
  INVOICE_NOT_FOUND: { status: 404, code: ErrorCode.NOT_FOUND },
  ORGANIZATION_NOT_FOUND: { status: 404, code: ErrorCode.NOT_FOUND },
  STRIPE_UNAVAILABLE: { status: 503, code: ErrorCode.UPSTREAM_UNAVAILABLE },
  NO_PLAN_CHANGE: { status: 400, code: ErrorCode.BAD_REQUEST },
  INVALID_PRICE_ID: { status: 400, code: ErrorCode.VALIDATION_ERROR, field: 'priceId' },
  NO_PENDING_CHANGE: { status: 409, code: ErrorCode.CONFLICT },
  ALREADY_SUBSCRIBED: { status: 409, code: ErrorCode.CONFLICT },
  USER_NOT_FOUND: { status: 404, code: ErrorCode.NOT_FOUND },
  SUBSCRIPTION_ORG_MISMATCH: { status: 403, code: ErrorCode.FORBIDDEN },
  SUBSCRIPTION_NOT_ACTIVE: { status: 402, code: ErrorCode.PAYMENT_REQUIRED },
  ALREADY_CANCELED: { status: 409, code: ErrorCode.CONFLICT },
  NOT_CANCELED: { status: 409, code: ErrorCode.CONFLICT },
  INVALID_REASON: { status: 400, code: ErrorCode.VALIDATION_ERROR, field: 'reason' },
  INVALID_PAYMENT_METHOD: {
    status: 400,
    code: ErrorCode.VALIDATION_ERROR,
    field: 'paymentMethodId',
  },
  INVALID_EMAIL: { status: 400, code: ErrorCode.VALIDATION_ERROR, field: 'email' },
  INVALID_LANGUAGE: { status: 400, code: ErrorCode.VALIDATION_ERROR, field: 'language' },
  INVALID_ADDRESS: { status: 400, code: ErrorCode.VALIDATION_ERROR, field: 'address' },
}

function createSubscriptionValidationError(
  message: string,
  field: string,
  reason: string
): ApiErrorResponse {
  return createApiErrorResponse(ErrorCode.VALIDATION_ERROR, message, { field, reason })
}

function mapSubscriptionDomainError(error: SubscriptionDomainError): {
  status: SubscriptionErrorStatus
  body: ApiErrorResponse
} {
  const meta = subscriptionDomainErrorMeta[error.code]
  return {
    status: meta.status,
    body: createApiErrorResponse(meta.code, error.message, {
      ...(meta.field ? { field: meta.field } : {}),
      reason: error.code,
    }),
  }
}

async function requireBillingManagerOrResponse(
  c: SubscriptionRouteContext,
  userId: string,
  organizationId?: string
): Promise<SubscriptionBillingMembership | Response> {
  try {
    return await subscriptionApplicationService.requireBillingManager({
      userId,
      organizationId,
    })
  } catch (error) {
    if (error instanceof SubscriptionBillingAccountError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    throw error
  }
}

subscriptionRoutes.get('/current', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  return c.json(await subscriptionApplicationService.getCurrent(user?.id ?? null))
})

subscriptionRoutes.post('/reconcile-seats/:organizationId', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const organizationId = c.req.param('organizationId')

  const billingManager = await requireBillingManagerOrResponse(c, user.id, organizationId)
  if (billingManager instanceof Response) return billingManager

  try {
    const result = await subscriptionApplicationService.reconcileSeats(organizationId, user.id)
    return c.json(result)
  } catch (error) {
    console.error('Error reconciling seats:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to reconcile'),
      500
    )
  }
})

subscriptionRoutes.get('/invoices', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const limit = Number(c.req.query('limit')) || 24
  const startingAfter = c.req.query('starting_after') || undefined

  try {
    const result = await subscriptionApplicationService.listInvoices({
      userId: user.id,
      limit,
      startingAfter,
    })
    return c.json(result)
  } catch (error) {
    if (error instanceof SubscriptionBillingAccountError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error fetching Stripe invoices:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch invoices'),
      500
    )
  }
})

subscriptionRoutes.get('/invoices/:id', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const invoiceId = c.req.param('id')

  try {
    const result = await subscriptionApplicationService.getInvoice({
      userId: user.id,
      invoiceId,
    })
    return c.json(result)
  } catch (error) {
    if (error instanceof SubscriptionBillingAccountError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error fetching Stripe invoice:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch invoice'),
      500
    )
  }
})

subscriptionRoutes.post('/portal', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  try {
    return c.json(await subscriptionApplicationService.createPortalSession({ userId: user.id }))
  } catch (error) {
    if (error instanceof SubscriptionBillingAccountError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error creating portal session:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create portal session'),
      500
    )
  }
})

subscriptionRoutes.post('/preview-change', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { priceId?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.priceId !== 'string' || body.priceId.length === 0) {
    return c.json(
      createSubscriptionValidationError('priceId is required', 'priceId', 'REQUIRED'),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.previewChange(
      billingManager.organizationId,
      body.priceId
    )
    return c.json(result)
  } catch (error) {
    if (error instanceof PlanChangeError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error previewing plan change:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while loading your plan change.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/change-plan', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { priceId?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.priceId !== 'string' || body.priceId.length === 0) {
    return c.json(
      createSubscriptionValidationError('priceId is required', 'priceId', 'REQUIRED'),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.changePlan(
      billingManager.organizationId,
      body.priceId,
      user.id
    )

    return c.json(result)
  } catch (error) {
    if (error instanceof PlanChangeError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error changing plan:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while updating your plan.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/cancel-pending-change', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const result = await subscriptionApplicationService.cancelPendingChange(
      billingManager.organizationId,
      user.id
    )

    return c.json(result)
  } catch (error) {
    if (error instanceof PlanChangeError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error canceling pending plan change:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while canceling the scheduled change.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/subscribe', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { priceId?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.priceId !== 'string' || body.priceId.length === 0) {
    return c.json(
      createSubscriptionValidationError('priceId is required', 'priceId', 'REQUIRED'),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.subscribe({
      organizationId: billingManager.organizationId,
      userId: user.id,
      priceId: body.priceId,
    })
    return c.json(result)
  } catch (error) {
    if (error instanceof SubscribeError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error creating subscription:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while starting your subscription.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/confirm-subscribe', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { subscriptionId?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.subscriptionId !== 'string' || body.subscriptionId.length === 0) {
    return c.json(
      createSubscriptionValidationError('subscriptionId is required', 'subscriptionId', 'REQUIRED'),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.confirmSubscribe({
      organizationId: billingManager.organizationId,
      subscriptionId: body.subscriptionId,
      actorId: user.id,
    })

    return c.json(result)
  } catch (error) {
    if (error instanceof SubscribeError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error confirming subscription:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while finalizing your subscription.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/cancel', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { reason?: unknown; feedback?: unknown }
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const reason =
    typeof body.reason === 'string' &&
    CANCEL_REASONS.includes(body.reason as (typeof CANCEL_REASONS)[number])
      ? body.reason
      : null

  const feedback = typeof body.feedback === 'string' ? body.feedback.slice(0, 2000) : null

  try {
    const result = await subscriptionApplicationService.cancel({
      organizationId: billingManager.organizationId,
      userId: user.id,
      reason,
      feedback,
    })

    return c.json(result)
  } catch (error) {
    if (error instanceof CancelSubscriptionError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error canceling subscription:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while canceling your subscription.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/resume', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const result = await subscriptionApplicationService.resume({
      organizationId: billingManager.organizationId,
      userId: user.id,
    })

    return c.json(result)
  } catch (error) {
    if (error instanceof CancelSubscriptionError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error resuming subscription:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while resuming your subscription.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/ensure-customer', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  try {
    return c.json(await subscriptionApplicationService.ensureCustomer({ userId: user.id }))
  } catch (error) {
    if (error instanceof SubscriptionBillingAccountError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error ensuring Stripe customer:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while preparing your billing profile.'
      ),
      500
    )
  }
})

subscriptionRoutes.get('/payment-method', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const paymentMethod = await subscriptionApplicationService.getPaymentMethod(
      billingManager.organizationId
    )
    return c.json({ paymentMethod })
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error fetching payment method:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while loading your payment method.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/setup-intent', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const result = await subscriptionApplicationService.createSetupIntent(
      billingManager.organizationId
    )
    return c.json(result)
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error creating setup intent:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while preparing the payment setup.'
      ),
      500
    )
  }
})

subscriptionRoutes.post('/update-payment-method', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { paymentMethodId?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.paymentMethodId !== 'string' || body.paymentMethodId.length === 0) {
    return c.json(
      createSubscriptionValidationError(
        'paymentMethodId is required',
        'paymentMethodId',
        'REQUIRED'
      ),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.updatePaymentMethod({
      organizationId: billingManager.organizationId,
      paymentMethodId: body.paymentMethodId,
      actorId: user.id,
    })

    return c.json(result)
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error updating payment method:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while updating your payment method.'
      ),
      500
    )
  }
})

subscriptionRoutes.get('/billing-address', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const address = await subscriptionApplicationService.getBillingAddress(
      billingManager.organizationId
    )
    return c.json({ address })
  } catch (error) {
    if (error instanceof BillingAddressError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error fetching billing address:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while loading your billing address.'
      ),
      500
    )
  }
})

subscriptionRoutes.put('/billing-address', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: {
    address?: {
      country?: unknown
      line1?: unknown
      line2?: unknown
      city?: unknown
      postalCode?: unknown
      state?: unknown
    }
    name?: unknown
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  const addr = body.address ?? {}
  if (
    typeof addr.country !== 'string' ||
    typeof addr.line1 !== 'string' ||
    typeof addr.city !== 'string' ||
    typeof addr.postalCode !== 'string'
  ) {
    return c.json(
      createSubscriptionValidationError(
        'Country, address line, city, and postal code are required.',
        'address',
        'INVALID_ADDRESS'
      ),
      400
    )
  }

  try {
    const saved = await subscriptionApplicationService.updateBillingAddress({
      organizationId: billingManager.organizationId,
      address: {
        country: addr.country,
        line1: addr.line1,
        line2: typeof addr.line2 === 'string' ? addr.line2 : null,
        city: addr.city,
        postalCode: addr.postalCode,
        state: typeof addr.state === 'string' ? addr.state : null,
      },
      name: typeof body.name === 'string' ? body.name : null,
      actorId: user.id,
    })

    return c.json({ address: saved })
  } catch (error) {
    if (error instanceof BillingAddressError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error updating billing address:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while updating your billing address.'
      ),
      500
    )
  }
})

subscriptionRoutes.get('/invoice-email', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const state = await subscriptionApplicationService.getInvoiceEmail(
      billingManager.organizationId
    )
    return c.json(state)
  } catch (error) {
    if (error instanceof InvoiceEmailError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error fetching invoice email:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while loading the invoice email.'
      ),
      500
    )
  }
})

subscriptionRoutes.put('/invoice-email', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { email?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.email !== 'string' || body.email.trim().length === 0) {
    return c.json(
      createSubscriptionValidationError(
        'A valid email address is required.',
        'email',
        'INVALID_EMAIL'
      ),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.updateInvoiceEmail(
      billingManager.organizationId,
      body.email,
      user.id
    )

    return c.json(result)
  } catch (error) {
    if (error instanceof InvoiceEmailError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error updating invoice email:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while updating the invoice email.'
      ),
      500
    )
  }
})

subscriptionRoutes.get('/invoice-language', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  try {
    const state = await subscriptionApplicationService.getInvoiceLanguage(
      billingManager.organizationId
    )
    return c.json(state)
  } catch (error) {
    if (error instanceof InvoiceLanguageError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error fetching invoice language:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while loading the invoice language.'
      ),
      500
    )
  }
})

subscriptionRoutes.put('/invoice-language', async (c) => {
  const user = c.get('user') as { id: string } | undefined

  if (!user) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }

  const billingManager = await requireBillingManagerOrResponse(c, user.id)
  if (billingManager instanceof Response) return billingManager

  let body: { language?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON body'), 400)
  }

  if (typeof body.language !== 'string' || body.language.trim().length === 0) {
    return c.json(
      createSubscriptionValidationError(
        'A supported invoice language is required.',
        'language',
        'INVALID_LANGUAGE'
      ),
      400
    )
  }

  try {
    const result = await subscriptionApplicationService.updateInvoiceLanguage(
      billingManager.organizationId,
      body.language,
      user.id
    )

    return c.json(result)
  } catch (error) {
    if (error instanceof InvoiceLanguageError) {
      const { status, body } = mapSubscriptionDomainError(error)
      return c.json(body, status)
    }
    console.error('Error updating invoice language:', error)
    return c.json(
      createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Something went wrong while updating the invoice language.'
      ),
      500
    )
  }
})

export default subscriptionRoutes
