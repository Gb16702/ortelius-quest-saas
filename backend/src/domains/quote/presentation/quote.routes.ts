import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import {
  QuoteCreateForbiddenError,
  QuoteLegalDocumentsMismatchError,
  QuoteOrganizationMissingError,
} from '../application/quote-errors'
import { UnsupportedQuoteCurrencyError } from '../domain'
import { quoteApplicationService } from '../quote.application'
import { requireQuoteOwnership } from './quote.middleware'
import {
  createQuoteSchema,
  organizationIdParamSchema,
  quoteIdParamSchema,
  quoteResponseSchema,
  requestIdParamSchema,
  updateQuoteSchema,
} from './quote.schemas'

const quote = new Hono<{ Variables: CommonVariables }>()

const quoteBadRequestMessages = new Set([
  'At least one legal document is required',
  'Can only update draft quotes',
  'Quote cannot be accepted in its current state',
  'Quote cannot be rejected in its current state',
  'Request not found or already quoted',
  'Request not found or not quoted',
  'User not associated with any organization',
])

const quoteForbiddenMessages = new Set([
  'Insufficient permissions to create quote',
  'Insufficient permissions to view organization quotes',
  'Only the request creator can accept quotes',
  'Only the request creator can reject quotes',
])

const quoteNotFoundMessages = new Set(['Associated request not found', 'Quote not found'])

function mapQuoteRouteError(
  error: unknown,
  fallback: string
): {
  status: 400 | 403 | 404 | 500
  response: ApiResponse
} {
  if (error instanceof QuoteCreateForbiddenError) {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, error.message),
    }
  }

  if (
    error instanceof QuoteOrganizationMissingError ||
    error instanceof QuoteLegalDocumentsMismatchError ||
    error instanceof UnsupportedQuoteCurrencyError
  ) {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, error.message),
    }
  }

  const message = error instanceof Error ? error.message : ''

  if (quoteNotFoundMessages.has(message)) {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, message),
    }
  }

  if (quoteForbiddenMessages.has(message)) {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, message),
    }
  }

  if (quoteBadRequestMessages.has(message)) {
    return {
      status: 400,
      response: createApiErrorResponse(ErrorCode.BAD_REQUEST, message),
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback),
  }
}

quote.post('/', requireAuthMiddleware, validateJson(createQuoteSchema), async (c) => {
  try {
    const user = c.get('user')!
    const data = c.req.valid('json')

    const newQuote = await quoteApplicationService.createAndSendQuote(data, user.id)

    const response: ApiResponse = {
      success: true,
      data: newQuote,
      message: 'Quote created and sent successfully',
    }
    return c.json(response, 201)
  } catch (error) {
    const mapped = mapQuoteRouteError(error, 'Failed to create quote')
    return c.json(mapped.response, mapped.status)
  }
})

quote.get(
  '/:id',
  requireAuthMiddleware,
  validateParam(quoteIdParamSchema),
  requireQuoteOwnership,
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const foundQuote = await quoteApplicationService.getQuoteById(id)

      const response: ApiResponse = {
        success: true,
        data: foundQuote,
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapQuoteRouteError(error, 'Failed to get quote')
      return c.json(mapped.response, mapped.status)
    }
  }
)

quote.put(
  '/:id',
  requireAuthMiddleware,
  validateParam(quoteIdParamSchema),
  validateJson(updateQuoteSchema),
  requireQuoteOwnership,
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const updates = c.req.valid('json')
      const user = c.get('user')!

      const updatedQuote = await quoteApplicationService.updateQuote(id, updates, user.id)

      const response: ApiResponse = {
        success: true,
        data: updatedQuote,
        message: 'Quote updated successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapQuoteRouteError(error, 'Failed to update quote')
      return c.json(mapped.response, mapped.status)
    }
  }
)

quote.post(
  '/:id/accept',
  requireAuthMiddleware,
  validateParam(quoteIdParamSchema),
  requireQuoteOwnership,
  async (c) => {
    try {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      const acceptedQuote = await quoteApplicationService.acceptQuote(id, user.id)

      const response: ApiResponse = {
        success: true,
        data: acceptedQuote,
        message: 'Quote accepted successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapQuoteRouteError(error, 'Failed to accept quote')
      return c.json(mapped.response, mapped.status)
    }
  }
)

quote.post(
  '/:id/reject',
  requireAuthMiddleware,
  validateParam(quoteIdParamSchema),
  validateJson(quoteResponseSchema),
  requireQuoteOwnership,
  async (c) => {
    try {
      const user = c.get('user')!
      const { id } = c.req.valid('param')
      const { rejectionReason } = c.req.valid('json')

      const rejectedQuote = await quoteApplicationService.rejectQuote(id, rejectionReason, user.id)

      const response: ApiResponse = {
        success: true,
        data: rejectedQuote,
        message: 'Quote rejected successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapQuoteRouteError(error, 'Failed to reject quote')
      return c.json(mapped.response, mapped.status)
    }
  }
)

quote.get(
  '/request/:requestId',
  requireAuthMiddleware,
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { requestId } = c.req.valid('param')
      const user = c.get('user')!
      const quotes = await quoteApplicationService.getQuotesByRequest(requestId, user.id)

      const response: ApiResponse = {
        success: true,
        data: quotes,
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapQuoteRouteError(error, 'Failed to get quotes')
      return c.json(mapped.response, mapped.status)
    }
  }
)

quote.get(
  '/organization/:organizationId',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user') as { id: string }
      const quotes = await quoteApplicationService.getOrganizationQuotes(organizationId, user.id)

      const response: ApiResponse = {
        success: true,
        data: quotes,
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapQuoteRouteError(error, 'Failed to get organization quotes')
      return c.json(mapped.response, mapped.status)
    }
  }
)

export default quote
