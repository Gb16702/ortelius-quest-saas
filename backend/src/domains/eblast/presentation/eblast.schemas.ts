import { z } from 'zod'
import { EmailTemplate } from '../../../../emails/types'

const validTemplates = Object.values(EmailTemplate)

export const sendEblastSchema = z.object({
  emails: z.array(z.email()).min(1, 'At least one email is required'),
  template: z.string().refine((val) => validTemplates.includes(val as EmailTemplate), {
    message: `Invalid template. Must be one of: ${validTemplates.join(', ')}`,
  }),
  templateProps: z.record(z.string(), z.unknown()),
  subject: z.string().min(1, 'Subject is required'),
  from: z.string().optional(),
})

export const jobIdParamSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
})

export type SendEblastInput = z.infer<typeof sendEblastSchema>
