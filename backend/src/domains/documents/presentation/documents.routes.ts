import { type Context, Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import { validateFile } from '../../../infrastructure/storage/file-upload.utils'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateParam } from '../../../infrastructure/validation/validation.utils'
import {
  RequestDocumentForbiddenError,
  RequestDocumentNotFoundError,
} from '../application/document-use-cases'
import {
  type DocumentsApplicationService,
  documentsApplicationService,
} from '../documents.application'
import { isDocumentFileValidationError } from '../domain'
import { documentUrlParamSchema, requestIdParamSchema } from './documents.schemas'

type DocumentsRouteService = Pick<
  DocumentsApplicationService,
  'uploadDocuments' | 'uploadDocumentsForRequest' | 'deleteRequestDocument' | 'generateRequestPdf'
>

export function createDocumentsRoutes(
  service: DocumentsRouteService = documentsApplicationService,
  authMiddleware = requireAuthMiddleware
) {
  const documents = new Hono<{ Variables: CommonVariables }>()

  documents.post('/upload', async (c) => {
    try {
      const body = await c.req.parseBody()
      const files: File[] = []

      for (const [_key, value] of Object.entries(body)) {
        if (value instanceof File) {
          const validation = validateFile(value, 'DOCUMENTS')
          if (!validation.valid) {
            const response: ApiResponse = createApiErrorResponse(
              ErrorCode.BAD_REQUEST,
              validation.error || 'File validation failed'
            )
            return c.json(response, 400)
          }
          files.push(value)
        }
      }

      if (files.length === 0) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.BAD_REQUEST,
          'No files provided'
        )
        return c.json(response, 400)
      }

      const uploadedDocuments = await service.uploadDocuments(files)
      const uploadedUrls = uploadedDocuments.map((doc) => doc.url)

      const response: ApiResponse<{ documents: string[]; count: number }> = {
        success: true,
        data: {
          documents: uploadedUrls,
          count: uploadedUrls.length,
        },
        message: 'Documents uploaded successfully',
      }

      return c.json(response, 201)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to upload documents'
      )
      return c.json(response, 500)
    }
  })

  documents.post(
    '/requests/:requestId/documents',
    authMiddleware,
    validateParam(requestIdParamSchema),
    async (c) => {
      try {
        const { requestId } = c.req.valid('param')
        const user = c.get('user')
        const body = await c.req.parseBody()
        const files: File[] = []

        for (const [_key, value] of Object.entries(body)) {
          if (value instanceof File) {
            files.push(value)
          }
        }

        if (files.length === 0) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.BAD_REQUEST,
            'No files provided'
          )
          return c.json(response, 400)
        }

        const uploadedUrls = await service.uploadDocumentsForRequest({
          requestId,
          actorId: user!.id,
          files,
        })

        const response: ApiResponse<{ documents: string[]; count: number }> = {
          success: true,
          data: {
            documents: uploadedUrls,
            count: uploadedUrls.length,
          },
          message: 'Documents uploaded successfully',
        }

        return c.json(response, 201)
      } catch (error) {
        return handleDocumentRouteError(c, error, 'Failed to upload request documents')
      }
    }
  )

  documents.delete(
    '/requests/:requestId/documents/:documentUrl',
    authMiddleware,
    validateParam(documentUrlParamSchema),
    async (c) => {
      try {
        const { requestId, documentUrl } = c.req.valid('param')
        const user = c.get('user')
        const decodedDocumentUrl = decodeURIComponent(documentUrl)

        const remainingDocuments = await service.deleteRequestDocument({
          requestId,
          actorId: user!.id,
          documentUrl: decodedDocumentUrl,
        })

        const response: ApiResponse<{ documents: string[] }> = {
          success: true,
          data: {
            documents: remainingDocuments,
          },
          message: 'Document deleted successfully',
        }

        return c.json(response, 200)
      } catch (error) {
        return handleDocumentRouteError(c, error, 'Failed to delete document')
      }
    }
  )

  documents.get(
    '/request/:requestId',
    authMiddleware,
    validateParam(requestIdParamSchema),
    async (c) => {
      try {
        const { requestId } = c.req.valid('param')
        const user = c.get('user')
        const pdf = await service.generateRequestPdf({ requestId, actorId: user!.id })

        c.header('Content-Type', 'application/pdf')
        c.header('Content-Disposition', `attachment; filename="${pdf.filename}"`)

        return c.body(new Uint8Array(pdf.buffer), 200)
      } catch (error) {
        if (error instanceof RequestDocumentNotFoundError) {
          const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, error.message)
          return c.json(response, 404)
        }

        console.error('Error generating PDF:', error)
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to generate PDF'
        )
        return c.json(response, 500)
      }
    }
  )

  return documents
}

function handleDocumentRouteError(
  c: Context<{ Variables: CommonVariables }>,
  error: unknown,
  fallback: string
) {
  if (error instanceof RequestDocumentNotFoundError) {
    const response: ApiResponse = createApiErrorResponse(ErrorCode.NOT_FOUND, error.message)
    return c.json(response, 404)
  }

  if (error instanceof RequestDocumentForbiddenError) {
    const response: ApiResponse = createApiErrorResponse(ErrorCode.FORBIDDEN, error.message)
    return c.json(response, 403)
  }

  if (isDocumentFileValidationError(error)) {
    const response: ApiResponse = createApiErrorResponse(ErrorCode.BAD_REQUEST, error.message)
    return c.json(response, 400)
  }

  const response: ApiResponse = createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback)
  return c.json(response, 500)
}

export default createDocumentsRoutes()
