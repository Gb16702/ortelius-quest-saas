import { z } from 'zod'

export const organizationSlugParamSchema = z.object({
  slug: z.string().min(1, 'Organization slug is required'),
})

export const metricsQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 30)),
})

export type OrganizationSlugParam = z.infer<typeof organizationSlugParamSchema>
export type MetricsQuery = z.infer<typeof metricsQuerySchema>
