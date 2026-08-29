import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import {
  requireOrganizationAdmin,
  requireOrganizationMember,
} from '../../../infrastructure/auth/auth-helpers.middleware'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import {
  LegalDocumentNotFoundError,
  LegalDocumentQuotaExceededError,
  LegalDocumentValidationError,
} from '../application/legal-document-errors'
import type { LegalDocumentUploadFile } from '../application/legal-document-models'
import { LEGAL_DOC_QUOTA_BYTES } from '../domain'
import {
  type LegalDocumentApplicationService,
  legalDocumentApplicationService,
} from '../legal-document.application'
import {
  documentIdParamSchema,
  type LegalDocument,
  legalDocumentSchema,
  listLegalDocumentsResponseSchema,
  organizationIdParamSchema,
  updateLegalDocumentSchema,
  uploadLegalDocumentMetadataArraySchema,
} from './legal-document.schemas'

type LegalDocumentRouteService = Pick<
  LegalDocumentApplicationService,
  'listForOrganization' | 'generateDownloadUrl' | 'upload' | 'updateLabel' | 'deleteById'
>

interface ParsedUpload {
  files: LegalDocumentUploadFile[]
  metadata: Array<{ label?: string }>
}

async function parseUploadBody(c: {
  req: { parseBody: (opts?: { all?: boolean }) => Promise<Record<string, unknown>> }
}): Promise<ParsedUpload | { error: string }> {
  const body = await c.req.parseBody({ all: true })
  const filesRaw = body.files ?? body['files[]']
  let files: File[] = []
  if (Array.isArray(filesRaw)) {
    files = filesRaw.filter((file): file is File => file instanceof File)
  } else if (filesRaw instanceof File) {
    files = [filesRaw]
  }

  let metadata: Array<{ label?: string }> = []
  const metadataRaw = body.metadata
  if (typeof metadataRaw === 'string' && metadataRaw.length > 0) {
    let parsed: unknown
    try {
      parsed = JSON.parse(metadataRaw)
    } catch {
      return { error: 'Invalid metadata JSON' }
    }
    const parseResult = uploadLegalDocumentMetadataArraySchema.safeParse(parsed)
    if (!parseResult.success) {
      return { error: 'Invalid metadata payload' }
    }
    metadata = parseResult.data
  }

  return { files, metadata }
}

function mapLegalDocumentError(
  error: unknown,
  fallback: string
): {
  status: 400 | 404 | 413 | 500
  response: ApiResponse
} {
  if (error instanceof LegalDocumentNotFoundError) {
    return {
      status: 404,
      response: createApiErrorResponse(ErrorCode.NOT_FOUND, error.message),
    }
  }

  if (error instanceof LegalDocumentQuotaExceededError) {
    return {
      status: 413,
      response: createApiErrorResponse(ErrorCode.PAYLOAD_TOO_LARGE, error.message, {
        ...error.details,
      }),
    }
  }

  if (error instanceof LegalDocumentValidationError) {
    return {
      status: error.statusCode,
      response: createApiErrorResponse(ErrorCode.VALIDATION_ERROR, error.message),
    }
  }

  return {
    status: 500,
    response: createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback),
  }
}

export function createLegalDocumentRoutes(
  service: LegalDocumentRouteService = legalDocumentApplicationService,
  authMiddleware = requireAuthMiddleware,
  memberMiddleware = requireOrganizationMember(),
  adminMiddleware = requireOrganizationAdmin
) {
  const legalDocuments = new Hono<{ Variables: CommonVariables }>()

  legalDocuments.get(
    '/:organizationId/legal-documents',
    authMiddleware,
    memberMiddleware,
    validateParam(organizationIdParamSchema),
    async (c) => {
      try {
        const { organizationId } = c.req.valid('param')
        const { documents, totalSizeBytes } = await service.listForOrganization(organizationId)

        const payload = listLegalDocumentsResponseSchema.parse({
          documents,
          totalSizeBytes,
          quotaBytes: LEGAL_DOC_QUOTA_BYTES,
        })

        const response: ApiResponse<typeof payload> = { success: true, data: payload }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapLegalDocumentError(error, 'Failed to list legal documents')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  legalDocuments.get(
    '/:organizationId/legal-documents/:documentId/download-url',
    authMiddleware,
    memberMiddleware,
    validateParam(documentIdParamSchema),
    async (c) => {
      try {
        const { organizationId, documentId } = c.req.valid('param')
        const data = await service.generateDownloadUrl(documentId, organizationId)
        const response: ApiResponse<typeof data> = { success: true, data }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapLegalDocumentError(error, 'Failed to generate download URL')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  legalDocuments.post(
    '/:organizationId/legal-documents',
    authMiddleware,
    adminMiddleware,
    validateParam(organizationIdParamSchema),
    async (c) => {
      try {
        const { organizationId } = c.req.valid('param')
        const user = c.get('user')!

        const parsed = await parseUploadBody(c)
        if ('error' in parsed) {
          const response: ApiResponse = createApiErrorResponse(ErrorCode.BAD_REQUEST, parsed.error)
          return c.json(response, 400)
        }

        const result = await service.upload({
          organizationId,
          uploadedById: user.id,
          files: parsed.files,
          metadata: parsed.metadata,
        })
        const documents = result.documents.map((document) => legalDocumentSchema.parse(document))

        const response: ApiResponse<{ documents: LegalDocument[] }> = {
          success: true,
          data: { documents },
          message: 'Legal documents uploaded successfully',
        }
        return c.json(response, 201)
      } catch (error) {
        console.error('[legal-document] upload error:', error)
        const mapped = mapLegalDocumentError(error, 'Failed to upload legal documents')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  legalDocuments.patch(
    '/:organizationId/legal-documents/:documentId',
    authMiddleware,
    adminMiddleware,
    validateParam(documentIdParamSchema),
    validateJson(updateLegalDocumentSchema),
    async (c) => {
      try {
        const { organizationId, documentId } = c.req.valid('param')
        const { label } = c.req.valid('json')
        if (!label) {
          const response: ApiResponse = createApiErrorResponse(
            ErrorCode.BAD_REQUEST,
            'label is required'
          )
          return c.json(response, 400)
        }
        const data = legalDocumentSchema.parse(
          await service.updateLabel(documentId, organizationId, label)
        )
        const response: ApiResponse<LegalDocument> = { success: true, data }
        return c.json(response, 200)
      } catch (error) {
        const mapped = mapLegalDocumentError(error, 'Failed to update legal document')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  legalDocuments.delete(
    '/:organizationId/legal-documents/:documentId',
    authMiddleware,
    adminMiddleware,
    validateParam(documentIdParamSchema),
    async (c) => {
      try {
        const { organizationId, documentId } = c.req.valid('param')
        await service.deleteById(documentId, organizationId)
        return c.body(null, 204)
      } catch (error) {
        const mapped = mapLegalDocumentError(error, 'Failed to delete legal document')
        return c.json(mapped.response, mapped.status)
      }
    }
  )

  return legalDocuments
}

export default createLegalDocumentRoutes()
