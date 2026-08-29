import { Hono } from 'hono'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import type { Category, CategoryWithSelectionStatus } from '../application/category-models'
import { categoriesApplicationService } from '../categories.application'
import { organizationIdParamSchema, patchOrganizationCategoriesSchema } from './categories.schemas'

const categories = new Hono<{ Variables: CommonVariables }>()

categories.get('/', async (c) => {
  try {
    const organizationId = c.get('organizationId')

    let categoryData: Category[]
    if (organizationId) {
      categoryData = await categoriesApplicationService.getByOrganization(organizationId)
    } else {
      categoryData = await categoriesApplicationService.getAll()
    }

    const response: ApiResponse<Category[]> = {
      success: true,
      data: categoryData,
    }

    return c.json(response, 200)
  } catch (_error) {
    const response: ApiResponse = createApiErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to fetch categories'
    )
    return c.json(response, 500)
  }
})

categories.get(
  '/organizations/:organizationId',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const categoryData = await categoriesApplicationService.getByOrganization(organizationId)

      const response: ApiResponse<Category[]> = {
        success: true,
        data: categoryData,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch organization categories'
      )
      return c.json(response, 500)
    }
  }
)

categories.patch(
  '/organizations/:organizationId',
  validateParam(organizationIdParamSchema),
  validateJson(patchOrganizationCategoriesSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const operations = c.req.valid('json')

      const categoryData = await categoriesApplicationService.updateOrganizationCategories(
        organizationId,
        operations
      )

      const response: ApiResponse<Category[]> = {
        success: true,
        data: categoryData,
        message: 'Organization categories updated successfully',
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update organization categories'
      )
      return c.json(response, 500)
    }
  }
)

categories.get(
  '/organizations/:organizationId/with-selection',
  validateParam(organizationIdParamSchema),
  async (c) => {
    try {
      const { organizationId } = c.req.valid('param')
      const categoryData = await categoriesApplicationService.getWithSelectionStatus(organizationId)

      const response: ApiResponse<CategoryWithSelectionStatus[]> = {
        success: true,
        data: categoryData,
      }

      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch categories with selection status'
      )
      return c.json(response, 500)
    }
  }
)

export default categories
