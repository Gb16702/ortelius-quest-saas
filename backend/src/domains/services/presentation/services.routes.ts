import { Hono } from 'hono'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import type { Service, ServiceWithSelectionStatus } from '../application/service-models'
import { servicesApplicationService } from '../services.application'
import { organizationIdParamSchema, patchOrganizationServicesSchema } from './services.schemas'

const services = new Hono<{ Variables: CommonVariables }>()

services.get('/', async (c) => {
  try {
    const organizationId = c.get('organizationId')

    let serviceData: Service[]
    if (organizationId) {
      serviceData = await servicesApplicationService.getByOrganization(organizationId)
    } else {
      serviceData = await servicesApplicationService.getAll()
    }

    const response: ApiResponse<Service[]> = {
      success: true,
      data: serviceData,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to fetch services'
    )
    return c.json(response, 500)
  }
})

services.get(
  '/organizations/:organizationId',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const serviceData = await servicesApplicationService.getByOrganization(organizationId)

      const response: ApiResponse<Service[]> = {
        success: true,
        data: serviceData,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization services'
      )
      return c.json(response, 500)
    }
  }
)

services.patch(
  '/organizations/:organizationId',
  validateParam(organizationIdParamSchema),
  validateJson(patchOrganizationServicesSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const operations = c.req.valid('json')

      const serviceData = await servicesApplicationService.updateOrganizationServices(
        organizationId,
        operations
      )

      const response: ApiResponse<Service[]> = {
        success: true,
        data: serviceData,
        message: 'Organization services updated successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update organization services'
      )
      return c.json(response, 500)
    }
  }
)

services.get(
  '/organizations/:organizationId/with-selection',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const serviceData = await servicesApplicationService.getWithSelectionStatus(organizationId)

      const response: ApiResponse<ServiceWithSelectionStatus[]> = {
        success: true,
        data: serviceData,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch services with selection status'
      )
      return c.json(response, 500)
    }
  }
)

export default services
