import { Hono } from 'hono'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import type {
  ImportBatchRecord,
  ImportResult,
  PriceSuggestion,
  PricingIntelligenceStats,
} from '../application/pricing-intelligence-models'
import {
  type PricingIntelligenceApplicationService,
  pricingIntelligenceApplicationService,
} from '../pricing-intelligence.application'
import { batchIdParamSchema, suggestPricingSchema } from './pricing-intelligence.schemas'

type PricingIntelligenceRouteService = Pick<
  PricingIntelligenceApplicationService,
  | 'deleteImportBatch'
  | 'generateCsvTemplate'
  | 'getImportBatches'
  | 'getStats'
  | 'importCsv'
  | 'resolveOrganizationIdForUser'
  | 'suggestPricing'
>

async function resolveOrganizationId(
  service: PricingIntelligenceRouteService,
  c: { get: (key: 'user') => { id: string } | undefined }
) {
  const user = c.get('user')
  if (!user) return null

  const organizationId = await service.resolveOrganizationIdForUser(user.id)
  if (!organizationId) return null

  return { organizationId, user }
}

export function createPricingIntelligenceRoutes(
  service: PricingIntelligenceRouteService = pricingIntelligenceApplicationService
) {
  const pricingIntelligence = new Hono<{ Variables: CommonVariables }>()

  pricingIntelligence.get('/template', async (c) => {
    try {
      const resolved = await resolveOrganizationId(service, c)
      if (!resolved) {
        return c.json(
          createApiErrorResponse(
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          ) satisfies ApiResponse,
          401
        )
      }

      const csv = await service.generateCsvTemplate(resolved.organizationId)

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="pricing-template.csv"',
        },
      })
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to generate template'
      )
      return c.json(response, 500)
    }
  })

  pricingIntelligence.post('/import', async (c) => {
    try {
      const resolved = await resolveOrganizationId(service, c)
      if (!resolved) {
        return c.json(
          createApiErrorResponse(
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          ) satisfies ApiResponse,
          401
        )
      }

      const formData = await c.req.formData()
      const file = formData.get('file')

      if (!file || !(file instanceof File)) {
        return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'CSV file is required'), 400)
      }

      const csvContent = await file.text()
      const result = await service.importCsv(
        resolved.organizationId,
        csvContent,
        file.name,
        resolved.user.id
      )

      const response: ApiResponse<ImportResult> = {
        success: true,
        data: result,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to import CSV'
      )
      return c.json(response, 500)
    }
  })

  pricingIntelligence.get('/imports', async (c) => {
    try {
      const resolved = await resolveOrganizationId(service, c)
      if (!resolved) {
        return c.json(
          createApiErrorResponse(
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          ) satisfies ApiResponse,
          401
        )
      }

      const batches = await service.getImportBatches(resolved.organizationId)

      const response: ApiResponse<ImportBatchRecord[]> = {
        success: true,
        data: batches,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch import batches'
      )
      return c.json(response, 500)
    }
  })

  pricingIntelligence.delete('/imports/:batchId', validateParam(batchIdParamSchema), async (c) => {
    try {
      const resolved = await resolveOrganizationId(service, c)
      if (!resolved) {
        return c.json(
          createApiErrorResponse(
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          ) satisfies ApiResponse,
          401
        )
      }

      const { batchId } = c.req.valid('param')
      await service.deleteImportBatch(batchId, resolved.organizationId)

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Import batch deleted',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to delete import batch'
      )
      return c.json(response, 500)
    }
  })

  pricingIntelligence.post('/suggest', validateJson(suggestPricingSchema), async (c) => {
    try {
      const resolved = await resolveOrganizationId(service, c)
      if (!resolved) {
        return c.json(
          createApiErrorResponse(
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          ) satisfies ApiResponse,
          401
        )
      }

      const context = c.req.valid('json')
      const suggestions = await service.suggestPricing(resolved.organizationId, context)

      const response: ApiResponse<PriceSuggestion[]> = {
        success: true,
        data: suggestions,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to generate pricing suggestions'
      )
      return c.json(response, 500)
    }
  })

  pricingIntelligence.get('/stats', async (c) => {
    try {
      const resolved = await resolveOrganizationId(service, c)
      if (!resolved) {
        return c.json(
          createApiErrorResponse(
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          ) satisfies ApiResponse,
          401
        )
      }

      const stats = await service.getStats(resolved.organizationId)

      const response: ApiResponse<PricingIntelligenceStats> = {
        success: true,
        data: stats,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch stats'
      )
      return c.json(response, 500)
    }
  })

  return pricingIntelligence
}

export default createPricingIntelligenceRoutes()
