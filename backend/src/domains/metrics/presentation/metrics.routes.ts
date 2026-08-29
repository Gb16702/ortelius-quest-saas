import { Hono } from 'hono'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateParam, validateQuery } from '../../../infrastructure/validation/validation.utils'
import { organizationApplicationService } from '../../organization/organization.application'
import type { MetricsResponse } from '../domain/metrics-models'
import { metricsApplicationService } from '../metrics.application'
import { metricsQuerySchema, organizationSlugParamSchema } from './metrics.schemas'

const metricsRoutes = new Hono<{ Variables: CommonVariables }>()

metricsRoutes.get(
  '/organizations/:slug',
  validateParam(organizationSlugParamSchema),
  validateQuery(metricsQuerySchema),
  async (c) => {
    try {
      const { slug } = c.req.valid('param')
      const { days } = c.req.valid('query')

      const organization = await organizationApplicationService.getBySlug(slug)
      if (!organization) {
        const response: ApiResponse = createApiErrorResponse(
          ErrorCode.NOT_FOUND,
          'Organization not found'
        )
        return c.json(response, 404)
      }

      const responseData = await metricsApplicationService.getOrganizationMetricsResponse(
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        days
      )

      const response: ApiResponse<MetricsResponse> = {
        success: true,
        data: responseData,
      }

      return c.json(response, 200)
    } catch (error) {
      console.error('Error fetching organization metrics:', error)

      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'An unknown error occurred'
      )

      return c.json(response, 500)
    }
  }
)

export default metricsRoutes
