import type { Context, Next } from 'hono'
import {
  throwForbidden,
  throwNotFound,
  throwUnauthorized,
} from '../../../../infrastructure/monitoring/error-handler.service'
import { requestsApplicationService } from '../../requests.application'

type RequestContextUser = { id: string }

export const requireRequestOwnership = async (c: Context, next: Next) => {
  const user = c.get('user') as RequestContextUser | null | undefined
  const requestId = c.req.param('requestId') || c.req.param('id')

  if (!user) {
    throwUnauthorized('Authentication required')
    return
  }

  if (!requestId) {
    throwNotFound('Request ID is required')
  }

  const request = await requestsApplicationService.getRequestById(requestId!)

  if (!request) {
    throwNotFound('Request not found')
  }

  const accessibleRequestId = await requestsApplicationService.resolveAccessibleRequestById(
    requestId!,
    user.id
  )

  if (!accessibleRequestId) {
    throwForbidden('You can only access your own requests or requests sent to your organization')
  }

  c.set('requestId', accessibleRequestId)
  await next()
}

export const requireRequestNumberOwnership = async (c: Context, next: Next) => {
  const user = c.get('user') as RequestContextUser | null | undefined
  const reqNumber = c.req.param('reqNumber')

  if (!user) {
    throwUnauthorized('Authentication required')
    return
  }

  if (!reqNumber) {
    throwNotFound('Request number is required')
  }

  const request = await requestsApplicationService.getRequestByNumber(reqNumber!)

  if (!request) {
    throwNotFound('Request not found')
  }

  const accessibleRequestId = await requestsApplicationService.resolveAccessibleRequestByNumber(
    reqNumber!,
    user.id
  )

  if (!accessibleRequestId) {
    throwForbidden('You can only access your own requests or requests sent to your organization')
  }

  c.set('requestId', accessibleRequestId)
  await next()
}
