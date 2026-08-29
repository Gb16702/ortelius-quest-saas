import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson } from '../../../infrastructure/validation/validation.utils'
import { type StorageApplicationService, storageApplicationService } from '../storage.application'
import {
  abortUploadRequestSchema,
  callRecordingUploadRequestSchema,
  completeUploadRequestSchema,
} from './storage.schemas'

type StorageRouteService = Pick<
  StorageApplicationService,
  'generateUploadUrls' | 'completeUpload' | 'abortUpload'
>

export function createStorageRoutes(
  service: StorageRouteService = storageApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const storageRoutes = new Hono<{ Variables: CommonVariables }>()

  storageRoutes.post(
    '/upload/generate-urls',
    validateJson(callRecordingUploadRequestSchema),
    async (c) => {
      try {
        const request = c.req.valid('json')

        const result = await service.generateUploadUrls(request)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          message: 'Upload URLs generated successfully',
        }

        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to generate upload URLs'
        )
        return c.json(response, 500)
      }
    }
  )

  storageRoutes.post(
    '/upload/complete',
    authMiddleware,
    validateJson(completeUploadRequestSchema),
    async (c) => {
      try {
        const user = c.get('user')!
        const request = c.req.valid('json')

        const speakerInfo =
          request.callId && request.conversationId
            ? {
                userId: user.id,
                userName: user.name!,
              }
            : undefined

        const result = await service.completeUpload(request, speakerInfo)

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          message: result.message,
        }

        return c.json(response, 200)
      } catch (_error) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to complete upload'
        )
        return c.json(response, 500)
      }
    }
  )

  storageRoutes.post('/upload/abort', validateJson(abortUploadRequestSchema), async (c) => {
    try {
      const request = c.req.valid('json')

      const result = await service.abortUpload(request)

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.message,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to abort upload'
      )
      return c.json(response, 500)
    }
  })

  return storageRoutes
}

export default createStorageRoutes()
