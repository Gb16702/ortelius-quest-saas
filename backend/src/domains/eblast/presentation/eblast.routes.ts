import { Hono } from 'hono'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { validateJson, validateParam } from '../../../infrastructure/validation/validation.utils'
import { type EblastApplicationService, eblastApplicationService } from '../eblast.application'
import { jobIdParamSchema, sendEblastSchema } from './eblast.schemas'

type EblastRouteService = Pick<
  EblastApplicationService,
  'getAvailableTemplates' | 'listJobs' | 'getJob' | 'startEblast'
>

export function createEblastRoutes(service: EblastRouteService = eblastApplicationService) {
  const eblast = new Hono<{ Variables: CommonVariables }>()

  eblast.get('/templates', async (c) => {
    try {
      const templates = await service.getAvailableTemplates()

      const response: ApiResponse = {
        success: true,
        data: { templates },
      }
      return c.json(response, 200)
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch templates'
      )
      return c.json(response, 500)
    }
  })

  eblast.get('/jobs', async (c) => {
    try {
      const jobs = await service.listJobs()

      return c.json(
        {
          success: true,
          data: { jobs },
        },
        200
      )
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch jobs'
      )
      return c.json(response, 500)
    }
  })

  eblast.get('/jobs/:jobId', validateParam(jobIdParamSchema), async (c) => {
    try {
      const { jobId } = c.req.valid('param')
      const job = await service.getJob(jobId)

      if (!job) {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Job not found'), 404)
      }

      return c.json(
        {
          success: true,
          data: job,
        },
        200
      )
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch job'
      )
      return c.json(response, 500)
    }
  })

  eblast.post('/send', validateJson(sendEblastSchema), async (c) => {
    try {
      const body = c.req.valid('json')

      const job = await service.startEblast({
        emails: body.emails,
        template: body.template,
        templateProps: body.templateProps,
        subject: body.subject,
        from: body.from,
      })

      return c.json(
        {
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            totalEmails: job.totalEmails,
          },
          message: `Eblast job started. Track progress at /eblast/jobs/${job.id}`,
        },
        202
      )
    } catch (_error) {
      const response: ApiResponse = createApiErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to start eblast'
      )
      return c.json(response, 500)
    }
  })

  return eblast
}

export default createEblastRoutes()
