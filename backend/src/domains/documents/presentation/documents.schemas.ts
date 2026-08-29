import { z } from 'zod'

export const requestIdParamSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
})

export const documentUrlParamSchema = z.object({
  requestId: z.uuid('Invalid request ID format'),
  documentUrl: z.url('Invalid document URL format'),
})
