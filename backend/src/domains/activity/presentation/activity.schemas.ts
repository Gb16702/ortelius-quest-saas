import { z } from 'zod'

export const activityFiltersSchema = z.object({
  organizationId: z.string().optional(),
  actorId: z.string().optional(),
  eventTypes: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (typeof val === 'string' ? val.split(',').filter(Boolean) : val))
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(25),
})

export type ActivityFiltersInput = z.infer<typeof activityFiltersSchema>

export const activityScoreQuerySchema = z.object({
  organizationId: z.string().optional(),
  actorId: z.string().min(1),
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90), z.literal(365)]))
    .default(30),
})

export type ActivityScoreQueryInput = z.infer<typeof activityScoreQuerySchema>
