import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import {
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import { type ContactApplicationService, contactApplicationService } from '../contact.application'
import { contactSchema } from './contact.schemas'

type ContactRouteService = Pick<ContactApplicationService, 'sendContactEmail'>

export function createContactRoutes(service: ContactRouteService = contactApplicationService) {
  const contactRoutes = new Hono<{ Variables: CommonVariables }>()

  contactRoutes.post('/', zValidator('json', contactSchema), async (c) => {
    try {
      const data = c.req.valid('json')
      const result = await service.sendContactEmail(data)
      return c.json(result, 200)
    } catch (error) {
      console.error('Failed to send contact email:', error)
      return c.json(
        createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to send message'),
        500
      )
    }
  })

  return contactRoutes
}

export default createContactRoutes()
