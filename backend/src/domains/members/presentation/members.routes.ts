import { Hono } from 'hono'
import type { AuthVariables } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateParam } from '../../../infrastructure/validation/validation.utils'
import type { MemberProfileResponse } from '../application/member-profile-models'
import { MemberProfileNotFoundError, MemberProfilePermissionError } from '../domain'
import { membersApplicationService } from '../members.application'
import { userIdParamSchema } from './members.schemas'

const membersRoutes = new Hono<{ Variables: AuthVariables }>()

membersRoutes.get('/:userId/profile', validateParam(userIdParamSchema), async (c) => {
  try {
    const user = c.get('user')

    if (!user) {
      const response: ApiResponse = createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized')
      return c.json(response, 401)
    }

    const { userId } = c.req.valid('param')

    const profileData = await membersApplicationService.getMemberProfile(userId, user.id)

    const response: ApiResponse<MemberProfileResponse> = {
      success: true,
      data: profileData,
    }

    return c.json(response, 200)
  } catch (error) {
    console.error('Error fetching member profile:', error)

    if (
      error instanceof MemberProfilePermissionError ||
      error instanceof MemberProfileNotFoundError
    ) {
      const response: ApiResponse = createApiErrorResponse(ErrorCode.FORBIDDEN, error.message)
      return c.json(response, 403)
    }

    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unknown error occurred'
    )

    return c.json(response, 500)
  }
})

export default membersRoutes
