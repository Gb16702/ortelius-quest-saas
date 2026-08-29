import { z } from 'zod'

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const categoryWithSelectionStatusSchema = categorySchema.extend({
  isSelected: z.boolean(),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1),
})

export const patchOrganizationCategoriesSchema = z
  .object({
    add: z.array(z.string().min(1)).optional(),
    remove: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.add || data.remove, {
    message: "At least one of 'add' or 'remove' must be provided",
  })

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type CategoryWithSelectionStatusInput = z.infer<typeof categoryWithSelectionStatusSchema>
export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
export type PatchOrganizationCategoriesInput = z.infer<typeof patchOrganizationCategoriesSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
