import { z } from 'zod'

export const getOnboardingStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const selectPlanSchema = z.object({
  plan: z.enum(['starter', 'professional', 'enterprise']),
  annual: z.boolean().optional().default(false),
  organizationId: z.string().min(1, 'Organization ID is required'),
})

export type GetOnboardingStatusInput = z.infer<typeof getOnboardingStatusSchema>
export type SelectPlanInput = z.infer<typeof selectPlanSchema>
