import type { Context, Next } from 'hono'
import {
  throwForbidden,
  throwNotFound,
  throwUnauthorized,
} from '../../../infrastructure/monitoring/error-handler.service'
import { quoteApplicationService } from '../quote.application'

export const requireQuoteOwnership = async (c: Context, next: Next) => {
  const user = c.get('user') as { id: string } | null | undefined
  const quoteId = c.req.param('quoteId') || c.req.param('id')

  if (!user) {
    throwUnauthorized('Authentication required')
    return
  }

  if (!quoteId) {
    throwNotFound('Quote ID is required')
    return
  }

  const access = await quoteApplicationService.resolveQuoteAccess(quoteId!, user.id)
  if (access === 'not_found') {
    throwNotFound('Quote not found')
  }

  if (access === 'forbidden') {
    throwForbidden('You can only access quotes from your organization or quotes for your requests')
  }

  c.set('quoteId', quoteId)
  await next()
}

export async function canCreateQuote(requestId: string, userId: string): Promise<boolean> {
  try {
    return await quoteApplicationService.canCreateQuote(requestId, userId)
  } catch {
    return false
  }
}
