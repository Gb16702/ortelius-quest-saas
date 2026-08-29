import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requestsApplicationService } from '../../requests.application'

export async function canPerformRequestActions(
  requestId: string,
  userId: string
): Promise<boolean> {
  return await requestsApplicationService.canPerformRequestActions(requestId, userId)
}

export const requireRequestActionPermission = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' })
    }

    const requestId = c.req.param('id') || c.req.param('requestId')
    if (!requestId) {
      throw new HTTPException(400, { message: 'Request ID required' })
    }

    const hasPermission = await canPerformRequestActions(requestId, user.id)
    if (!hasPermission) {
      throw new HTTPException(403, {
        message:
          'You do not have permission to perform this action. Only admins, owners, or the assigned member can perform actions on this request.',
      })
    }

    await next()
  }
}
