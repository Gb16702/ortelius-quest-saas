import type { Context, Next } from 'hono'
import { createApiErrorResponse, ErrorCode } from '../../../../infrastructure/types/api.types'
import { requestsApplicationService } from '../../requests.application'

export const preventSelfRequestMiddleware = async (c: Context, next: Next) => {
  try {
    const user = c.get('user')
    const data = c.get('validatedData') || (await c.req.json())

    if (!user || !data.receiverOrganizationId) {
      await next()
      return
    }

    const isOwnOrganization = await requestsApplicationService.isRequestToUserOrganization(
      user.id,
      data.receiverOrganizationId
    )

    if (isOwnOrganization) {
      return c.json(
        createApiErrorResponse(
          ErrorCode.BAD_REQUEST,
          'You cannot create a request to your own organization'
        ),
        400
      )
    }

    await next()
  } catch (error) {
    console.error('Error in preventSelfRequestMiddleware:', error)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error'),
      500
    )
  }
}
