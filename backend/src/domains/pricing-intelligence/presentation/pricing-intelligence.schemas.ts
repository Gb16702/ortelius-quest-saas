import { z } from 'zod'

export const suggestPricingSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1),
  cargoCategories: z.array(z.string()),
  cargoWeight: z.number().nullable(),
  cargoVolume: z.number().nullable(),
  cargoIsHazardous: z.boolean(),
  cargoIsReefer: z.boolean(),
  cargoIsOversized: z.boolean(),
})

export const batchIdParamSchema = z.object({
  batchId: z.string().min(1),
})

export type SuggestPricingInput = z.infer<typeof suggestPricingSchema>
export type BatchIdParam = z.infer<typeof batchIdParamSchema>
