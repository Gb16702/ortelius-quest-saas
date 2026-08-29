import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import { INVOICE_DOMAIN_ERROR_CODES, InvoiceDomainError } from '../domain'
import { invoiceApplicationService } from '../invoice.application'
import { requireInvoiceOwnership } from './invoice.middleware'
import {
  createInvoiceSchema,
  invoiceIdParamSchema,
  organizationIdParamSchema,
  requestIdParamSchema,
} from './invoice.schemas'

const invoice = new Hono<{ Variables: CommonVariables }>()

function mapInvoiceRouteError(
  error: unknown,
  fallback: string
): {
  status: 400 | 403 | 404 | 409 | 500
  response: ApiResponse
} {
  if (error instanceof InvoiceDomainError) {
    const status = error.code === INVOICE_DOMAIN_ERROR_CODES.INVOICE_ALREADY_EXISTS ? 409 : 400
    return {
      status,
      response: createApiErrorResponse(status === 409 ? 'CONFLICT' : 'BAD_REQUEST', error.message),
    }
  }

  const message = error instanceof Error ? error.message : ''

  if (
    message === 'Quote not found' ||
    message === 'Associated request not found' ||
    message === 'Invoice not found'
  ) {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, message),
    }
  }

  if (message === 'You are not a member of this organization') {
    return {
      status: 403,
      response: createApiErrorResponse(ErrorCode.FORBIDDEN, message),
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback),
  }
}

invoice.post('/', requireAuthMiddleware, validateJson(createInvoiceSchema), async (c) => {
  try {
    const user = c.get('user')!
    const { quoteId, dueDate, description, terms, notes } = c.req.valid('json')

    const newInvoice = await invoiceApplicationService.createInvoiceFromQuote({
      quoteId,
      actorId: user.id,
      dueDate: new Date(dueDate),
      description,
      terms,
      notes,
    })

    const response: ApiResponse = {
      success: true,
      data: newInvoice,
      message: 'Invoice created successfully',
    }
    return c.json(response, 201)
  } catch (error) {
    const mapped = mapInvoiceRouteError(error, 'Failed to create invoice')
    return c.json(mapped.response, mapped.status)
  }
})

invoice.get(
  '/:id',
  requireAuthMiddleware,
  validateParam(invoiceIdParamSchema),
  requireInvoiceOwnership,
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const foundInvoice = await invoiceApplicationService.getInvoiceById(id)

      if (!foundInvoice) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.NOT_FOUND,
          'Invoice not found'
        )
        return c.json(response, 404)
      }

      const response: ApiResponse = {
        success: true,
        data: foundInvoice,
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to get invoice'
      )
      return c.json(response, 500)
    }
  }
)

invoice.patch(
  '/:id/send',
  requireAuthMiddleware,
  validateParam(invoiceIdParamSchema),
  requireInvoiceOwnership,
  async (c) => {
    try {
      const user = c.get('user')!
      const { id } = c.req.valid('param')

      const sentInvoice = await invoiceApplicationService.sendInvoice(id, user.id)

      const response: ApiResponse = {
        success: true,
        data: sentInvoice,
        message: 'Invoice sent successfully',
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapInvoiceRouteError(error, 'Failed to send invoice')
      return c.json(mapped.response, mapped.status)
    }
  }
)

invoice.get(
  '/organization/:organizationId',
  requireAuthMiddleware,
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const user = c.get('user')!
      const invoices = await invoiceApplicationService.getInvoicesByOrganization(
        organizationId,
        user.id
      )

      const response: ApiResponse = {
        success: true,
        data: invoices,
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapInvoiceRouteError(error, 'Failed to get organization invoices')
      return c.json(mapped.response, mapped.status)
    }
  }
)

invoice.get(
  '/request/:requestId',
  requireAuthMiddleware,
  validateParam(requestIdParamSchema),
  async (c) => {
    try {
      const { requestId } = c.req.valid('param')
      const user = c.get('user')!
      const invoices = await invoiceApplicationService.getInvoicesByRequest(requestId, user.id)

      const response: ApiResponse = {
        success: true,
        data: invoices,
      }
      return c.json(response, 200)
    } catch (error) {
      const mapped = mapInvoiceRouteError(error, 'Failed to get request invoices')
      return c.json(mapped.response, mapped.status)
    }
  }
)

export default invoice
