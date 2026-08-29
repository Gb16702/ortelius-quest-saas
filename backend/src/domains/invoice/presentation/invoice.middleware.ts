import type { Context, Next } from 'hono'
import {
  throwForbidden,
  throwNotFound,
  throwUnauthorized,
} from '../../../infrastructure/monitoring/error-handler.service'
import { invoiceApplicationService } from '../invoice.application'

export const requireInvoiceOwnership = async (c: Context, next: Next) => {
  const user = c.get('user') as { id: string } | undefined
  const invoiceId = c.req.param('invoiceId') || c.req.param('id')

  if (!user) {
    throwUnauthorized('Authentication required')
    return
  }

  if (!invoiceId) {
    throwNotFound('Invoice ID is required')
    return
  }

  const decision = await invoiceApplicationService.checkInvoiceAccess(invoiceId, user.id)
  if (decision === 'not_found') {
    throwNotFound('Invoice not found')
  }

  if (decision === 'allowed') {
    c.set('invoiceId', invoiceId)
    await next()
    return
  }

  throwForbidden(
    'You can only access invoices from your organization or invoices for your requests'
  )
}
